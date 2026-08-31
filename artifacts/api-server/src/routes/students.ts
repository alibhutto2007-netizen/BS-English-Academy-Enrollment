import { Router, type IRouter } from "express";
import {
  CreateStudentBody,
  CreateStudentResponse,
  DeleteStudentParams,
  GetStudentParams,
  GetStudentResponse,
  ListStudentsQueryParams,
  ListStudentsResponse,
  UpdateStudentBody,
  UpdateStudentParams,
  UpdateStudentResponse,
} from "@workspace/api-zod";
import { supabase } from "../lib/supabase";
import { requireAdmin } from "../middlewares/require-admin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const studentColumns =
  "id,student_name,current_class,last_academy,school_college,contact_number,date_of_birth,date_of_admission,gender,home_address,course_subject,batch,time,created_at";

const batchTimes: Record<string, string> = {
  Basic: "2:00 PM - 3:00 PM",
  Advance: "3:00 PM - 4:00 PM",
  Medium: "4:00 PM - 5:00 PM",
  "Free Batch": "5:00 PM - 6:00 PM",
};

function hasValidBatchTime(batch: string, time: string) {
  return batchTimes[batch] === time;
}

function toStudent(row: Record<string, unknown>) {
  return {
    id: row.id,
    studentName: row.student_name,
    currentClass: row.current_class,
    lastAcademy: row.last_academy,
    schoolCollege: row.school_college,
    contactNumber: row.contact_number,
    dateOfBirth: row.date_of_birth,
    dateOfAdmission: row.date_of_admission,
    gender: row.gender,
    homeAddress: row.home_address,
    courseSubject: row.course_subject,
    batch: row.batch,
    time: row.time,
    createdAt: row.created_at,
  };
}

function toRow(input: Record<string, unknown>) {
  return {
    student_name: input.studentName,
    current_class: input.currentClass,
    last_academy: input.lastAcademy,
    school_college: input.schoolCollege,
    contact_number: input.contactNumber,
    date_of_birth: input.dateOfBirth,
    date_of_admission: input.dateOfAdmission,
    gender: input.gender,
    home_address: input.homeAddress,
    course_subject: input.courseSubject,
    batch: input.batch,
    time: input.time,
  };
}

function enrollmentStorageError(error: { code?: string; message?: string }) {
  if (error.code === "23514") {
    return "Supabase rejected this enrollment because a database constraint is outdated. Apply the latest supabase/schema.sql, including the Free Batch constraint.";
  }
  if (error.code === "42P01" || error.code === "PGRST205") {
    return "The Supabase public.students table is missing. Apply supabase/schema.sql before accepting enrollments.";
  }
  if (error.code === "PGRST204") {
    return "The Supabase students table does not match the current app fields. Apply the latest supabase/schema.sql.";
  }
  return "Unable to save enrollment to Supabase.";
}

router.get("/students", requireAdmin, async (req, res) => {
  const parsed = ListStudentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid student filters." });
    return;
  }

  const { search, batch, time, limit } = parsed.data;
  let query = supabase
    .from("students")
    .select(studentColumns)
    .order("created_at", { ascending: false })
    .limit(limit ?? 500);

  if (batch) query = query.eq("batch", batch);
  if (time) query = query.eq("time", time);
  if (search) {
    const escaped = search.replaceAll(",", " ");
    query = query.or(
      `student_name.ilike.%${escaped}%,contact_number.ilike.%${escaped}%,school_college.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    logger.error(
      { supabase: { code: error.code, message: error.message, details: error.details, hint: error.hint } },
      "Unable to load students from Supabase",
    );
    res.status(503).json({ error: "Unable to load students from Supabase." });
    return;
  }
  res.json(ListStudentsResponse.parse((data ?? []).map(toStudent)));
});

router.post("/students", async (req, res) => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete all required fields." });
    return;
  }
  if (!hasValidBatchTime(parsed.data.batch, parsed.data.time)) {
    res.status(400).json({ error: "That batch and class time combination is not available." });
    return;
  }
  const { data, error } = await supabase
    .from("students")
    .insert(toRow(parsed.data))
    .select(studentColumns)
    .single();

  if (error || !data) {
    if (error) {
      logger.error(
        { supabase: { code: error.code, message: error.message, details: error.details, hint: error.hint } },
        "Unable to save enrollment to Supabase",
      );
    }
    res.status(503).json({ error: error ? enrollmentStorageError(error) : "Unable to save enrollment to Supabase." });
    return;
  }
  res.status(201).json(CreateStudentResponse.parse(toStudent(data)));
});

router.get("/students/:id", requireAdmin, async (req, res) => {
  const parsed = GetStudentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  const { data, error } = await supabase
    .from("students")
    .select(studentColumns)
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (error || !data) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  res.json(GetStudentResponse.parse(toStudent(data)));
});

router.patch("/students/:id", requireAdmin, async (req, res) => {
  const params = UpdateStudentParams.safeParse(req.params);
  const body = UpdateStudentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid student details." });
    return;
  }
  if (!hasValidBatchTime(body.data.batch, body.data.time)) {
    res.status(400).json({ error: "That batch and class time combination is not available." });
    return;
  }
  const { data, error } = await supabase
    .from("students")
    .update(toRow(body.data))
    .eq("id", params.data.id)
    .select(studentColumns)
    .maybeSingle();
  if (error || !data) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  res.json(UpdateStudentResponse.parse(toStudent(data)));
});

router.delete("/students/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteStudentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  const { data, error } = await supabase
    .from("students")
    .delete()
    .eq("id", parsed.data.id)
    .select("id");
  if (error || !data?.length) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  res.status(204).send();
});

export default router;