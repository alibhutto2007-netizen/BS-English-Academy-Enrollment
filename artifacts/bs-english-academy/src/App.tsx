import { Fragment, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  Download,
  House,
  Layers,
  Lightbulb,
  ListFilter,
  LogOut,
  MapPin,
  Moon,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  UserCheck,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import { SiInstagram, SiTiktok, SiWhatsapp } from 'react-icons/si';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getGetDashboardSummaryQueryKey,
  getGetStudentQueryKey,
  getListStudentsQueryKey,
  setAuthTokenGetter,
  setBaseUrl,
  useCreateStudent,
  useDeleteStudent,
  useGetDashboardSummary,
  useGetStudent,
  useListStudents,
  useUpdateStudent,
  type Student,
  type StudentInput,
  type StudentInputBatch,
  type StudentInputTime,
} from '@workspace/api-client-react';
import {
  ClerkProvider,
  SignIn,
  useAuth,
  useClerk,
} from '@clerk/react';

import { shadcn } from '@clerk/themes';
import { DatePickerField, FilterSelect, FormSelect, NameInput, NumericInput } from '@/components/academy-form-controls';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { isValidDateValue, parseLocalDate, sanitizeName, sanitizePhone, toLocalDateValue } from '@/lib/input-sanitizers';

const queryClient = new QueryClient();
const TODAY = toLocalDateValue(new Date());
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function normalizeDateString(val?: string | Date | null): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const d = new Date(val);
    return toLocalDateValue(d);
  }
  if (val instanceof Date) {
    return toLocalDateValue(val);
  }
  return '';
}

let currentGetToken: (() => Promise<string | null>) | null = null;
const apiOrigin = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = currentGetToken ? await currentGetToken() : null;
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const url = `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) errorMessage = parsed.error;
      else if (parsed.message) errorMessage = parsed.message;
    } catch {}
    throw new Error(errorMessage || `API error: ${response.statusText}`);
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}
const academyLogo = `${basePath}/logo.png`;
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;



const WHATSAPP_URL = 'https://wa.me/923098575110';
const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=Gareeb+Muqam%2C+near+Big+Fish+Market%2C+Larkana';

const GENDER_OPTIONS = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Other', label: 'Other' },
];

const HOW_HEARD_OPTIONS = [
  { value: 'Friend/Family', label: 'Friend / Family' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Google Search', label: 'Google Search' },
  { value: 'Academy Referral', label: 'Academy Referral' },
  { value: 'Other', label: 'Other' },
];

const EMPTY_FORM: StudentInput = {
  studentName: '',
  currentClass: '',
  lastAcademy: '',
  schoolCollege: '',
  contactNumber: '',
  dateOfBirth: '',
  dateOfAdmission: TODAY,
  gender: 'Female',
  homeAddress: '',
  courseSubject: '',
  batch: '',
  time: '',
  howHeardAboutUs: 'WhatsApp',
};

const dateValueSchema = z.string().refine(isValidDateValue, 'Choose a valid date.');
const enrollmentSchema = z.object({
  studentName: z.string().trim().min(2, "Please enter the student's full name.").max(120, 'Name is too long.'),
  currentClass: z.string().trim().min(1, 'Please add the current class.').max(80, 'Class is too long.'),
  lastAcademy: z.string().trim().min(1, 'Please add the last academy.').max(160, 'Academy name is too long.'),
  schoolCollege: z.string().trim().min(1, 'Please add the school or college.').max(160, 'Institution name is too long.'),
  contactNumber: z.string().min(7, 'Please enter a valid contact number.').max(15, 'Contact number is too long.'),
  dateOfBirth: dateValueSchema.refine((value) => value <= TODAY, 'Date of birth cannot be in the future.'),
  dateOfAdmission: dateValueSchema,
  gender: z.enum(['Female', 'Male', 'Other']),
  homeAddress: z.string().trim().min(1, 'Please add the home address.').max(500, 'Address is too long.'),
  courseSubject: z.string().trim().min(1, 'Please choose a course subject.').max(120, 'Course subject is too long.'),
  batch: z.string().trim().min(1, 'Please select a batch.').max(80, 'Batch name is too long.'),
  time: z.string().trim().min(1, 'Please select class time.').max(80, 'Time is too long.'),
  howHeardAboutUs: z.string().trim().min(1, 'Please tell us how you heard about us.').max(200, 'Response is too long.'),
});

export type CourseItem = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
};

export type BatchItem = {
  id: string;
  course_id?: string;
  name: string;
  description?: string;
  is_active: boolean;
};

export type TimingItem = {
  id: string;
  batch_id?: string;
  day?: string;
  start_time: string;
  end_time: string;
  label?: string;
  is_active: boolean;
};

export type AdminItem = {
  id: string;
  clerk_id?: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  is_active: boolean;
};

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: 'hsl(43 96% 48%)',
    colorForeground: 'hsl(221 30% 16%)',
    colorMutedForeground: 'hsl(221 12% 46%)',
    colorDanger: 'hsl(4 68% 51%)',
    colorBackground: 'hsl(45 40% 99%)',
    colorInput: 'hsl(40 25% 89%)',
    colorInputForeground: 'hsl(221 30% 16%)',
    colorNeutral: 'hsl(39 22% 85%)',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    borderRadius: '0.7rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[hsl(45_40%_99%)] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[hsl(221_30%_16%)]',
    headerSubtitle: 'text-[hsl(221_12%_46%)]',
    socialButtonsBlockButtonText: 'text-[hsl(221_30%_16%)]',
    formFieldLabel: 'text-[hsl(221_30%_16%)]',
    footerActionLink: 'text-[hsl(204_45%_23%)]',
    footerActionText: 'text-[hsl(221_12%_46%)]',
    dividerText: 'text-[hsl(221_12%_46%)]',
    identityPreviewEditButton: 'text-[hsl(204_45%_23%)]',
    formFieldSuccessText: 'text-[hsl(148_35%_43%)]',
    alertText: 'text-[hsl(4_68%_51%)]',
    logoBox: 'mb-2',
    logoImage: 'max-h-16',
    socialButtonsBlockButton: 'border-[hsl(39_22%_85%)]',
    formButtonPrimary: 'bg-[hsl(43_96%_48%)] text-[hsl(224_26%_14%)]',
    formFieldInput: 'bg-[hsl(45_40%_99%)] text-[hsl(221_30%_16%)]',
    footerAction: 'text-[hsl(221_12%_46%)]',
    dividerLine: 'bg-[hsl(39_22%_85%)]',
    alert: 'bg-[hsl(4_68%_51%_/_0.09)]',
    otpCodeFieldInput: 'text-[hsl(221_30%_16%)]',
    formFieldRow: 'text-[hsl(221_30%_16%)]',
    main: 'text-[hsl(221_30%_16%)]',
  },
};

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'ST';
}

function displayDate(value?: string) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getRequestErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'We could not save this enrollment right now. Please try again.';
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('bs-academy-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button type="button" className="academy-btn academy-btn-outline academy-btn-small academy-focus" onClick={() => setDark((value) => !value)} data-testid="button-toggle-theme" aria-label="Toggle day and night theme">
      {dark ? <Sun size={15} /> : <Moon size={15} />}
      <span>{dark ? 'Day' : 'Night'}</span>
    </button>
  );
}

function ApiConfiguration() {
  const { getToken } = useAuth();

  useEffect(() => {
    setBaseUrl(import.meta.env.VITE_API_BASE_URL || null);
    setAuthTokenGetter(() => getToken());
    currentGetToken = () => getToken();
    return () => {
      setAuthTokenGetter(null);
      currentGetToken = null;
    };
  }, [getToken]);

  return null;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup" data-testid="brand-academy">
      <img src={academyLogo} alt="BS English Virtual Academy crest" />
      {!compact && (
        <div>
          <strong>BS English</strong>
          <span>Academy · Larkana</span>
        </div>
      )}
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a className="rail-social-link" href={href} target="_blank" rel="noreferrer" aria-label={label}>
      {children}
    </a>
  );
}

function PublicFooter() {
  return (
    <div className="rail-footer">
      <div className="rail-credit">
        <span>Developed by <strong>Muhammad Ali</strong></span>
        <small>Contact for Customized Web Application || Games</small>
        <SocialLink href="https://www.instagram.com/muhammad_ali_bhutto2076/" label="Muhammad Ali on Instagram">
          <SiInstagram size={15} aria-hidden="true" />
          <span>@muhammad_ali_2076</span>
        </SocialLink>
      </div>
      <div className="rail-socials" aria-label="BS English Virtual Academy social links">
        <span className="rail-social-label">Follow the academy</span>
        <div className="rail-social-row">
          <SocialLink href="https://www.instagram.com/bs746151/" label="BS English Virtual Academy on Instagram">
            <SiInstagram size={16} aria-hidden="true" />
            <span>Instagram</span>
          </SocialLink>
          <SocialLink href="https://www.tiktok.com/@suhailalee786" label="BS English Virtual Academy on TikTok">
            <SiTiktok size={16} aria-hidden="true" />
            <span>TikTok</span>
          </SocialLink>
        </div>
      </div>
      <div className="rail-contact" aria-label="Academy contact information">
        <SocialLink href={WHATSAPP_URL} label="Contact BS English Virtual Academy on WhatsApp">
          <SiWhatsapp size={15} aria-hidden="true" />
          <span>+92 3098575110</span>
        </SocialLink>
        <SocialLink href={MAP_URL} label="Open BS English Virtual Academy address in Google Maps">
          <MapPin size={15} aria-hidden="true" />
          <span>Gareeb Muqam, near Big Fish Market, Larkana</span>
        </SocialLink>
      </div>
    </div>
  );
}

function AcademyContactFooter() {
  return (
    <footer className="academy-contact-footer">
      <div>
        <span className="footer-kicker">BS English Virtual Academy · Larkana</span>
        <strong>Need help with enrollment?</strong>
      </div>
      <div className="footer-contact-links">
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="contact-footer-link">
          <SiWhatsapp size={16} aria-hidden="true" />
          <span>WhatsApp: +92 3098575110</span>
        </a>
        <a href={MAP_URL} target="_blank" rel="noreferrer" className="contact-footer-link">
          <MapPin size={16} aria-hidden="true" />
          <span>Gareeb Muqam, near Big Fish Market, Larkana</span>
        </a>
      </div>
    </footer>
  );
}

type FieldProps = { label: string; htmlFor: string; error?: string; children: ReactNode };

function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div>
      <label className="academy-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p className="academy-help" data-testid={`error-${htmlFor}`}>{error}</p>}
    </div>
  );
}

function EnrollmentPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState<Student | null>(null);
  const [serverError, setServerError] = useState('');
  const createStudent = useCreateStudent();

  const { data: dbCourses = [] } = useQuery<CourseItem[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/courses');
        return Array.isArray(res) ? res : (res?.courses || []);
      } catch {
        return [];
      }
    },
  });

  const { data: dbBatches = [] } = useQuery<BatchItem[]>({
    queryKey: ['batches'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/batches');
        return Array.isArray(res) ? res : (res?.batches || []);
      } catch {
        return [];
      }
    },
  });

  const { data: dbTimings = [] } = useQuery<TimingItem[]>({
    queryKey: ['timings'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/timings');
        return Array.isArray(res) ? res : (res?.timings || []);
      } catch {
        return [];
      }
    },
  });

  const { control, register, watch, setValue, trigger, handleSubmit, formState: { errors } } = useForm<StudentInput>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: EMPTY_FORM,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const selectedCourse = watch('courseSubject');
  const selectedBatch = watch('batch');
  const selectedTime = watch('time');

  const courseOptions = useMemo(() => {
    if (dbCourses && dbCourses.length > 0) {
      return dbCourses.map((c) => ({ value: c.name, label: c.name }));
    }
    return [];
  }, [dbCourses]);

  const batchOptions = useMemo(() => {
    if (!selectedCourse) return [];
    
    // Find the actual course object to get its ID
    const courseObj = dbCourses?.find((c) => c.name === selectedCourse);
    if (!courseObj) return [];
    
    if (dbBatches && dbBatches.length > 0) {
      // Filter batches by selected course's ID
      return dbBatches
        .filter((b) => b.course_id === courseObj.id && b.is_active !== false)
        .map((b) => ({ 
          value: b.name, 
          label: b.name === 'Free Batch' ? 'Free Batch (Registration Fee Only)' : b.name 
        }));
    }
    return [];
  }, [selectedCourse, dbBatches, dbCourses]);

  const availableTimes = useMemo(() => {
    if (!selectedBatch) return [];
    const matchingBatch = dbBatches.find((b) => b.name.toLowerCase() === selectedBatch.toLowerCase());
    if (matchingBatch) {
      const timings = dbTimings.filter((t) => t.batch_id === matchingBatch.id && t.is_active !== false);
      if (timings.length > 0) {
        return timings.map((t) => `${t.start_time} - ${t.end_time}`);
      }
    }
    return [];
  }, [selectedBatch, dbBatches, dbTimings]);

  useEffect(() => {
    if (availableTimes.length > 0 && !availableTimes.includes(selectedTime)) {
      setValue('time', availableTimes[0] as any, { shouldValidate: true, shouldDirty: true });
    }
  }, [availableTimes, selectedTime, setValue]);

  async function moveForward() {
    const fields = step === 1
      ? (['studentName', 'contactNumber', 'dateOfBirth', 'gender'] as const)
      : (['currentClass', 'lastAcademy', 'schoolCollege', 'homeAddress', 'courseSubject', 'howHeardAboutUs'] as const);
    if (await trigger(fields)) setStep((current) => Math.min(3, current + 1));
  }

  function submitEnrollment(data: StudentInput) {
    setServerError('');
    const cleanData: StudentInput = {
      ...data,
      studentName: sanitizeName(data.studentName),
      currentClass: data.currentClass.trim(),
      lastAcademy: data.lastAcademy.trim(),
      schoolCollege: data.schoolCollege.trim(),
      contactNumber: sanitizePhone(data.contactNumber),
      homeAddress: data.homeAddress.trim(),
      courseSubject: data.courseSubject.trim(),
      howHeardAboutUs: data.howHeardAboutUs.trim(),
    };
    createStudent.mutate({ data: cleanData }, {
      onSuccess: (student) => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setSubmitted(student);
      },
      onError: (error) => setServerError(getRequestErrorMessage(error)),
    });
  }

  function handleInvalid(fieldErrors: Record<string, unknown>) {
    const firstError = Object.keys(fieldErrors)[0];
    if (['studentName', 'contactNumber', 'dateOfBirth', 'gender'].includes(firstError)) setStep(1);
    else if (['currentClass', 'lastAcademy', 'schoolCollege', 'homeAddress', 'courseSubject', 'howHeardAboutUs'].includes(firstError)) setStep(2);
    else if (firstError) setStep(3);
  }

  function downloadConfirmation() {
    if (!submitted) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BS ENGLISH VIRTUAL ACADEMY', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.text('ENROLLMENT RECORD', pageWidth / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Reference', margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(submitted.id, margin, y);
    y += 10;

    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    const details = [
      ['Student Name', submitted.studentName],
      ['Contact Number', submitted.contactNumber],
      ['Date of Birth', displayDate(submitted.dateOfBirth)],
      ['Gender', submitted.gender],
      ['Current Class', submitted.currentClass],
      ['School / College', submitted.schoolCollege],
      ['Last Academy', submitted.lastAcademy],
      ['Course Subject', submitted.courseSubject],
      ['Admission Date', displayDate(submitted.dateOfAdmission)],
      ['Batch', submitted.batch],
      ['Class Time', submitted.time],
      ['Home Address', submitted.homeAddress],
      ['How did you hear about us?', submitted.howHeardAboutUs],
    ];

    autoTable(doc, {
      startY: y,
      body: details,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 55 },
        1: { textColor: [0, 0, 0] },
      },
      didDrawCell: (data) => {
        if (data.row.index < details.length - 1) {
          doc.setDrawColor(230);
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setDrawColor(200);
    doc.line(margin, finalY, pageWidth - margin, finalY);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('BS English Virtual Academy', pageWidth / 2, finalY + 7, { align: 'center' });
    doc.text('Larkana', pageWidth / 2, finalY + 12, { align: 'center' });

    doc.save(`bs-english-enrollment-${submitted.id.slice(0, 8)}.pdf`);
  }

  return (
    <div className="academy-app enroll-shell">
      <aside className="enroll-rail">
        <Brand />
        <div className="rail-copy academy-fade-in">
          <div className="academy-eyebrow" style={{ color: 'hsl(var(--primary))' }}>Admissions desk · Larkana</div>
          <h1>Start with<br /><em>the right words.</em></h1>
          <p>Tell us a little about the learner. We will help you choose a comfortable class rhythm and a clear path forward.</p>
        </div>
        <div className="rail-bottom">
          <div className="rail-note">
            <ShieldCheck size={17} />
            <span>Your details are reviewed by the academy team with care. No queues, no paper file to carry.</span>
          </div>
          <PublicFooter />
        </div>
      </aside>
      <main className="enroll-main">
        <div className="top-line">
          <ThemeToggle />
        </div>
        <div className="enroll-content">
          {!submitted ? (
            <>
              <header className="form-heading academy-fade-in">
                <div className="academy-eyebrow">New student enrollment</div>
                <h2>A good beginning<br />is worth arranging.</h2>
                <p>Three short steps. We ask only what helps our teachers welcome the student properly.</p>
              </header>
              <div className="stepper" aria-label="Enrollment progress">
                {['Student', 'Background', 'Schedule'].map((label, index) => {
                  const number = index + 1;
                  return (
                    <Fragment key={label}>
                      <div className={`step-node ${step === number ? 'active' : ''} ${step > number ? 'done' : ''}`} data-testid={`step-${number}`}>
                        <b>{step > number ? <Check size={13} /> : number}</b><span>{label}</span>
                      </div>
                      {number < 3 && <div className="step-line" />}
                    </Fragment>
                  );
                })}
              </div>
              <form onSubmit={handleSubmit(submitEnrollment, handleInvalid)} noValidate>
                {serverError && <div className="academy-help" style={{ marginBottom: '1rem' }} data-testid="error-form">{serverError}</div>}
                {step === 1 && (
                  <div className="form-grid academy-fade-in">
                    <div className="form-span">
                      <Controller
                        name="studentName"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field label="Student full name" htmlFor="studentName" error={fieldState.error?.message}>
                            <NameInput id="studentName" className={`academy-input ${fieldState.error ? 'invalid' : ''}`} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} placeholder="e.g. Areeba Ahmed" data-testid="input-student-name" />
                          </Field>
                        )}
                      />
                    </div>
                    <Controller
                      name="contactNumber"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field label="Contact number" htmlFor="contactNumber" error={fieldState.error?.message}>
                          <NumericInput id="contactNumber" className={`academy-input ${fieldState.error ? 'invalid' : ''}`} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} placeholder="03XX XXX XXXX" data-testid="input-contact-number" maxLength={15} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="dateOfBirth"
                      control={control}
                      render={({ field, fieldState }) => (
                        <DatePickerField id="dateOfBirth" label="Date of birth" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} maxDate={parseLocalDate(TODAY)} testId="input-date-of-birth" />
                      )}
                    />
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field, fieldState }) => (
                        <FormSelect id="gender" label="Gender" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} options={GENDER_OPTIONS} testId="select-gender" />
                      )}
                    />
                  </div>
                )}
                {step === 2 && (
                  <div className="form-grid academy-fade-in">
                    <Field label="Current class / grade" htmlFor="currentClass" error={errors.currentClass?.message}>
                      <input id="currentClass" className={`academy-input ${errors.currentClass ? 'invalid' : ''}`} {...register('currentClass')} placeholder="e.g. Class 8" data-testid="input-current-class" />
                    </Field>
                    <Field label="School / college" htmlFor="schoolCollege" error={errors.schoolCollege?.message}>
                      <input id="schoolCollege" className={`academy-input ${errors.schoolCollege ? 'invalid' : ''}`} {...register('schoolCollege')} placeholder="Current institution" data-testid="input-school-college" />
                    </Field>
                    <Field label="Last academy attended" htmlFor="lastAcademy" error={errors.lastAcademy?.message}>
                      <input id="lastAcademy" className={`academy-input ${errors.lastAcademy ? 'invalid' : ''}`} {...register('lastAcademy')} placeholder="Where did they learn before?" data-testid="input-last-academy" />
                    </Field>
                    <Controller
                      name="courseSubject"
                      control={control}
                      render={({ field, fieldState }) => (
                        <FormSelect id="courseSubject" label="Course subject" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} options={courseOptions} testId="select-course-subject" />
                      )}
                    />
                    <div className="form-span">
                      <Field label="Home address" htmlFor="homeAddress" error={errors.homeAddress?.message}>
                        <textarea id="homeAddress" rows={3} className={`academy-input ${errors.homeAddress ? 'invalid' : ''}`} {...register('homeAddress')} placeholder="House, street, area, Larkana" data-testid="textarea-home-address" />
                      </Field>
                    </div>
                    <Controller
                      name="howHeardAboutUs"
                      control={control}
                      render={({ field, fieldState }) => (
                        <FormSelect id="howHeardAboutUs" label="How did you hear about us?" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} options={HOW_HEARD_OPTIONS} testId="select-how-heard" />
                      )}
                    />
                  </div>
                )}
                {step === 3 && (
                  <div className="academy-fade-in">
                    <div className="form-grid">
                      <Controller
                        name="dateOfAdmission"
                        control={control}
                        render={({ field, fieldState }) => (
                          <DatePickerField id="dateOfAdmission" label="Admission date" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} testId="input-date-of-admission" />
                        )}
                      />
                      <Controller
                        name="batch"
                        control={control}
                        render={({ field, fieldState }) => (
                          <FormSelect id="batch" label="Preferred batch" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} options={batchOptions} testId="select-batch" />
                        )}
                      />
                      <div className="form-span">
                        <Controller
                          name="time"
                          control={control}
                          render={({ field, fieldState }) => (
                            <FormSelect id="time" label="Preferred class time" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} options={availableTimes.map((item) => ({ value: item, label: item }))} testId="select-time" />
                          )}
                        />
                      </div>
                    </div>
                    <p className="field-note">{selectedBatch === 'Free Batch' ? 'Free Batch is available with registration fee only.' : 'Each batch is paired with a dedicated class time so the desk can plan consistently.'}</p>
                    <div className="academy-eyebrow" style={{ margin: '1.5rem 0 .7rem' }}>Review before sending</div>
                    <div className="review-list">
                      <div className="review-item"><span>Student</span><strong>{watch('studentName')}</strong></div>
                      <div className="review-item"><span>Contact</span><strong>{watch('contactNumber')}</strong></div>
                      <div className="review-item"><span>Learning at</span><strong>{watch('schoolCollege')}</strong></div>
                      <div className="review-item"><span>Course</span><strong>{watch('courseSubject')}</strong></div>
                      <div className="review-item"><span>Batch</span><strong>{selectedBatch}</strong></div>
                      <div className="review-item"><span>Class time</span><strong>{selectedTime}</strong></div>
                      <div className="review-item"><span>How you found us</span><strong>{watch('howHeardAboutUs')}</strong></div>
                    </div>
                  </div>
                )}
                <div className="form-actions">
                  {step > 1 ? <button type="button" className="academy-btn academy-btn-outline academy-focus" onClick={() => setStep((current) => current - 1)} data-testid="button-previous-step"><ArrowLeft size={15} /> Back</button> : <span />}
                  {step < 3 ? (
                    <button type="button" className="academy-btn academy-btn-primary academy-focus" onClick={moveForward} data-testid="button-next-step">Continue <ArrowRight size={15} /></button>
                  ) : (
                    <button type="submit" className="academy-btn academy-btn-primary academy-focus" disabled={createStudent.isPending} data-testid="button-submit-enrollment">{createStudent.isPending ? 'Saving enrollment…' : 'Send enrollment'} <Check size={15} /></button>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="success-view academy-fade-in" data-testid="view-enrollment-success">
              <div className="success-mark"><Check size={34} strokeWidth={2.5} /></div>
              <div className="academy-eyebrow">Enrollment received · {submitted.id}</div>
              <h2>We are ready for<br />{submitted.studentName}.</h2>
              <p>The academy team has received the enrollment. Keep this confirmation for your records; we will contact you shortly to confirm the first class.</p>
              <div className="success-actions">
                <button type="button" className="academy-btn academy-btn-primary" onClick={downloadConfirmation} data-testid="button-download-confirmation"><Download size={15} /> Download confirmation</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminSidebar({ currentTab, onSelectTab }: { currentTab: string; onSelectTab: (tab: string) => void }) {
  const { signOut } = useClerk();
  return (
    <aside className="admin-sidebar">
      <Link href="/" data-testid="link-admin-brand"><Brand compact={false} /></Link>
      <nav className="admin-nav" aria-label="Admin navigation">
        <button
          type="button"
          className={`side-action ${currentTab === 'records' ? 'active' : ''}`}
          onClick={() => onSelectTab('records')}
          data-testid="tab-admissions-desk"
          style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: currentTab === 'records' ? 'hsl(var(--accent))' : 'transparent', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
        >
          <House size={17} /><span>Admissions desk</span>
        </button>
        <button
          type="button"
          className={`side-action ${currentTab === 'courses' ? 'active' : ''}`}
          onClick={() => onSelectTab('courses')}
          data-testid="tab-courses-batches"
          style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: currentTab === 'courses' ? 'hsl(var(--accent))' : 'transparent', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
        >
          <Layers size={17} /><span>Courses & Batches</span>
        </button>
        <button
          type="button"
          className={`side-action ${currentTab === 'admins' ? 'active' : ''}`}
          onClick={() => onSelectTab('admins')}
          data-testid="tab-admin-users"
          style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: currentTab === 'admins' ? 'hsl(var(--accent))' : 'transparent', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
        >
          <Users size={17} /><span>Admin Staff</span>
        </button>
        <Link href="/" data-testid="link-new-enrollment"><Plus size={17} /><span>New enrollment</span></Link>
      </nav>
      <div className="admin-sidebar-bottom">
        <button type="button" className="side-action" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-admin-signout"><LogOut size={17} /><span>Sign out of desk</span></button>
      </div>
    </aside>
  );
}

type CountItem = { label: string; count: number };

function summarizeStudents(records: Student[]) {
  const batchCounts = new Map<string, number>();
  const timeCounts = new Map<string, number>();
  const courseCounts = new Map<string, number>();
  let todayAdmissions = 0;

  for (const student of records) {
    batchCounts.set(student.batch, (batchCounts.get(student.batch) ?? 0) + 1);
    timeCounts.set(student.time, (timeCounts.get(student.time) ?? 0) + 1);
    courseCounts.set(student.courseSubject, (courseCounts.get(student.courseSubject) ?? 0) + 1);
    if (student.dateOfAdmission?.slice(0, 10) === TODAY) {
      todayAdmissions += 1;
    }
  }

  return {
    totalStudents: records.length,
    todayAdmissions,
    batchCounts: Array.from(batchCounts, ([label, count]) => ({ label, count })),
    timeCounts: Array.from(timeCounts, ([label, count]) => ({ label, count })),
    courseCounts: Array.from(courseCounts, ([label, count]) => ({ label, count })),
  };
}

function chartLabel(label: string) {
  return label
    .replace(':00 PM', '')
    .replace(' - ', '–')
    .replace(':00 PM', '')
    .replace('Free Batch', 'Free');
}

function AnalyticsChart({ title, data }: { title: string; data: CountItem[] }) {
  return (
    <section className="academy-surface chart-card" data-testid={`chart-${title.toLowerCase().replaceAll(' ', '-')}`}>
      <h3>{title}</h3>
      <div className="visual-chart">
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={data.map((item) => ({ ...item, shortLabel: chartLabel(item.label) }))} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <Tooltip cursor={{ fill: 'hsl(var(--primary) / .08)' }} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 10, color: 'hsl(var(--foreground))', fontSize: 12 }} formatter={(value) => [value, 'Enrollments']} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        {data.filter((item) => item.count > 0).map((item) => <span key={item.label}><i />{item.label}: <strong>{item.count}</strong></span>)}
        {!data.some((item) => item.count > 0) && <span>No enrollments yet.</span>}
      </div>
    </section>
  );
}

function StudentRow({ student, onOpen }: { student: Student; onOpen: (id: string) => void }) {
  return (
    <tr data-testid={`row-student-${student.id}`}>
      <td><div className="student-name"><span className="initials">{initials(student.studentName)}</span><span>{student.studentName}<span className="cell-sub">{student.currentClass || 'Class not added'}</span></span></div></td>
      <td>{student.courseSubject}<span className="cell-sub">{student.schoolCollege}</span></td>
      <td><span className="batch-tag">{student.batch}</span><span className="cell-sub">{student.time}{student.batch === 'Free Batch' ? ' · Registration fee only' : ''}</span></td>
      <td>{displayDate(student.dateOfAdmission)}<span className="cell-sub">{student.contactNumber}</span></td>
      <td><div className="table-actions"><button type="button" className="icon-btn" onClick={() => onOpen(student.id)} data-testid={`button-view-student-${student.id}`} aria-label={`View ${student.studentName}`}><ChevronRight size={16} /></button></div></td>
    </tr>
  );
}

function StudentModal({ studentId, onClose, onChanged }: { studentId: string; onClose: () => void; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const { data: detail, isLoading, isError } = useGetStudent(studentId, { query: { queryKey: getGetStudentQueryKey(studentId) } });
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<StudentInput | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const record = detail;

  const { data: dbCourses = [] } = useQuery<CourseItem[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/courses');
        return Array.isArray(res) ? res : (res?.courses || []);
      } catch {
        return [];
      }
    },
  });

  const { data: dbBatches = [] } = useQuery<BatchItem[]>({
    queryKey: ['batches'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/batches');
        return Array.isArray(res) ? res : (res?.batches || []);
      } catch {
        return [];
      }
    },
  });

  const courseOptions = useMemo(() => {
    if (dbCourses && dbCourses.length > 0) {
      return dbCourses.map((c) => ({ value: c.name, label: c.name }));
    }
    return [];
  }, [dbCourses]);

  const batchOptions = useMemo(() => {
    const editSelectedCourse = editForm?.courseSubject;
    if (!editSelectedCourse) return [];
    
    // Find the actual course object to get its ID
    const courseObj = dbCourses?.find((c) => c.name === editSelectedCourse);
    if (!courseObj) return [];
    
    if (dbBatches && dbBatches.length > 0) {
      // Filter batches by selected course's ID
      return dbBatches
        .filter((b) => b.course_id === courseObj.id && b.is_active !== false)
        .map((b) => ({ 
          value: b.name, 
          label: b.name === 'Free Batch' ? 'Free Batch (Registration Fee Only)' : b.name 
        }));
    }
    return [];
  }, [editForm?.courseSubject, dbBatches, dbCourses]);

  useEffect(() => {
    if (detail) {
      setEditForm({
        ...detail,
        dateOfBirth: normalizeDateString(detail.dateOfBirth),
        dateOfAdmission: normalizeDateString(detail.dateOfAdmission),
      });
      setEditErrors({});
    }
  }, [detail]);

  function updateField<K extends keyof StudentInput>(key: K, value: StudentInput[K]) {
    setEditForm((current) => current ? { ...current, [key]: value } : current);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm) return;
    const parsed = enrollmentSchema.safeParse(editForm);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === 'string' && !nextErrors[key]) nextErrors[key] = issue.message;
      });
      setEditErrors(nextErrors);
      return;
    }
    setEditErrors({});
    updateStudent.mutate({
      id: studentId,
      data: {
        ...parsed.data as StudentInput,
        studentName: sanitizeName(parsed.data.studentName),
        contactNumber: sanitizePhone(parsed.data.contactNumber),
      },
    }, {
      onSuccess: (returnedData) => {
        // IMPORTANT: Update local state with returned server data to fix stale data bug
        setEditForm({
          ...returnedData,
          dateOfBirth: normalizeDateString(returnedData.dateOfBirth),
          dateOfAdmission: normalizeDateString(returnedData.dateOfAdmission),
        });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(studentId) });
        setEditing(false);
        onChanged();
      },
      onError: (err: any) => {
        const message = err?.message || 'Failed to save changes. Please try again.';
        setEditErrors({ studentName: message });
      },
    });
  }

  function removeStudent() {
    if (!window.confirm('Remove this enrollment record? This cannot be undone.')) return;
    deleteStudent.mutate({ id: studentId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        onChanged();
        onClose();
      },
    });
  }

  return (
    <motion.div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }}>
      <motion.section className="academy-surface modal-card academy-scrollbar" role="dialog" aria-modal="true" aria-label="Student enrollment detail" data-testid="modal-student-detail" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .25, ease: 'easeOut' }}>
        <div className="modal-head">
          <div><div className="academy-eyebrow">Enrollment record</div><h2>{record?.studentName || (isLoading ? 'Loading record' : 'Student record')}</h2><p>{record ? `Reference ${record.id} · received ${displayDate(record.createdAt)}` : 'Please wait while we load the details.'}</p></div>
          <button type="button" className="icon-btn" onClick={onClose} data-testid="button-close-student-modal" aria-label="Close detail"><X size={18} /></button>
        </div>
        {isLoading && <div className="academy-skeleton" style={{ height: 200, borderRadius: '.7rem' }} data-testid="skeleton-student-detail" />}
        {isError && <div className="error-state"><CircleAlert size={27} /><strong>Record unavailable</strong><span>This enrollment may have been removed.</span></div>}
        {record && !editing && (
          <>
            <div className="modal-section"><div className="modal-grid">
              <div className="modal-field"><span>Contact number</span><strong>{record.contactNumber}</strong></div>
              <div className="modal-field"><span>Date of birth</span><strong>{displayDate(record.dateOfBirth)}</strong></div>
              <div className="modal-field"><span>Gender</span><strong>{record.gender}</strong></div>
              <div className="modal-field"><span>Current class</span><strong>{record.currentClass}</strong></div>
              <div className="modal-field"><span>School / college</span><strong>{record.schoolCollege}</strong></div>
              <div className="modal-field"><span>Last academy</span><strong>{record.lastAcademy}</strong></div>
            </div></div>
            <div className="modal-section"><div className="modal-grid">
              <div className="modal-field"><span>Course subject</span><strong>{record.courseSubject}</strong></div>
              <div className="modal-field"><span>Admission date</span><strong>{displayDate(record.dateOfAdmission)}</strong></div>
              <div className="modal-field"><span>Batch and time</span><strong>{record.batch} · {record.time}</strong></div>
              <div className="modal-field"><span>Home address</span><strong>{record.homeAddress}</strong></div>
              <div className="modal-field"><span>How did you hear about us?</span><strong>{record.howHeardAboutUs}</strong></div>
            </div></div>
            <div className="form-actions"><button type="button" className="academy-btn academy-btn-danger academy-btn-small" onClick={removeStudent} disabled={deleteStudent.isPending} data-testid="button-delete-student"><Trash2 size={14} /> {deleteStudent.isPending ? 'Removing…' : 'Remove record'}</button><button type="button" className="academy-btn academy-btn-primary academy-btn-small" onClick={() => setEditing(true)} data-testid="button-edit-student"><Pencil size={14} /> Edit record</button></div>
          </>
        )}
        {record && editing && editForm && (
          <form onSubmit={saveEdit}>
            <div className="modal-grid">
              <Field label="Student name" htmlFor="edit-student-name" error={editErrors.studentName}><NameInput id="edit-student-name" className={`academy-input ${editErrors.studentName ? 'invalid' : ''}`} value={editForm.studentName} onValueChange={(value) => updateField('studentName', value)} data-testid="input-edit-student-name" /></Field>
              <Field label="Contact number" htmlFor="edit-contact" error={editErrors.contactNumber}><NumericInput id="edit-contact" className={`academy-input ${editErrors.contactNumber ? 'invalid' : ''}`} value={editForm.contactNumber} onValueChange={(value) => updateField('contactNumber', value)} data-testid="input-edit-contact" maxLength={15} /></Field>
              <Field label="Current class" htmlFor="edit-class" error={editErrors.currentClass}><input id="edit-class" className={`academy-input ${editErrors.currentClass ? 'invalid' : ''}`} value={editForm.currentClass} onChange={(event) => updateField('currentClass', event.target.value)} data-testid="input-edit-class" /></Field>
              <Field label="School / college" htmlFor="edit-school" error={editErrors.schoolCollege}><input id="edit-school" className={`academy-input ${editErrors.schoolCollege ? 'invalid' : ''}`} value={editForm.schoolCollege} onChange={(event) => updateField('schoolCollege', event.target.value)} data-testid="input-edit-school" /></Field>
              <FormSelect id="edit-course" label="Course subject" value={editForm.courseSubject} onValueChange={(value) => updateField('courseSubject', value)} error={editErrors.courseSubject} options={courseOptions} testId="select-edit-course" />
              <FormSelect id="edit-batch" label="Batch" value={editForm.batch} onValueChange={(value) => updateField('batch', value as any)} error={editErrors.batch} options={batchOptions} testId="select-edit-batch" />
              <Field label="Class time" htmlFor="edit-time" error={editErrors.time}><input id="edit-time" className={`academy-input ${editErrors.time ? 'invalid' : ''}`} value={editForm.time} onChange={(e) => updateField('time', e.target.value as any)} placeholder="e.g. 2:00 PM - 3:00 PM" data-testid="input-edit-time" /></Field>
              <DatePickerField id="edit-admission-date" label="Admission date" value={editForm.dateOfAdmission} onValueChange={(value) => updateField('dateOfAdmission', value)} error={editErrors.dateOfAdmission} testId="input-edit-admission-date" />
              <div className="form-span"><Field label="Home address" htmlFor="edit-address" error={editErrors.homeAddress}><textarea id="edit-address" rows={2} className={`academy-input ${editErrors.homeAddress ? 'invalid' : ''}`} value={editForm.homeAddress} onChange={(event) => updateField('homeAddress', event.target.value)} data-testid="textarea-edit-address" /></Field></div>
              <FormSelect id="edit-how-heard" label="How did you hear about us?" value={editForm.howHeardAboutUs} onValueChange={(value) => updateField('howHeardAboutUs', value)} error={editErrors.howHeardAboutUs} options={HOW_HEARD_OPTIONS} testId="select-edit-how-heard" />
            </div>
            <div className="form-actions"><button type="button" className="academy-btn academy-btn-outline academy-btn-small" onClick={() => setEditing(false)} data-testid="button-cancel-edit">Cancel</button><button type="submit" className="academy-btn academy-btn-primary academy-btn-small" disabled={updateStudent.isPending} data-testid="button-save-student">{updateStudent.isPending ? 'Saving…' : 'Save changes'} <Check size={14} /></button></div>
          </form>
        )}
      </motion.section>
    </motion.div>
  );
}

function CoursesAndBatchesPanel() {
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [selectedCourseForBatch, setSelectedCourseForBatch] = useState('');
  const [newBatchName, setNewBatchName] = useState('');
  const [selectedBatchForTiming, setSelectedBatchForTiming] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const { data: courses = [], refetch: refetchCourses } = useQuery<CourseItem[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await apiFetch('/api/courses');
      return Array.isArray(res) ? res : (res?.courses || []);
    },
  });

  const { data: batches = [], refetch: refetchBatches } = useQuery<BatchItem[]>({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await apiFetch('/api/batches');
      return Array.isArray(res) ? res : (res?.batches || []);
    },
  });

  const { data: timings = [], refetch: refetchTimings } = useQuery<TimingItem[]>({
    queryKey: ['timings'],
    queryFn: async () => {
      const res = await apiFetch('/api/timings');
      return Array.isArray(res) ? res : (res?.timings || []);
    },
  });

  async function createCourse(e: FormEvent) {
    e.preventDefault();
    if (!newCourseName.trim()) {
      setStatusMsg('Please enter a course name.');
      return;
    }
    try {
      await apiFetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCourseName.trim(), description: newCourseDesc.trim() }),
      });
      setNewCourseName('');
      setNewCourseDesc('');
      setStatusMsg('Course created successfully!');
      refetchCourses();
    } catch (err: any) {
      setStatusMsg(`Failed to create course: ${err?.message || err}`);
    }
  }

  async function deleteCourse(id: string) {
    if (!window.confirm('Delete this course?')) return;
    try {
      await apiFetch(`/api/courses/${id}`, { method: 'DELETE' });
      setStatusMsg('Course deleted successfully.');
      refetchCourses();
    } catch (err: any) {
      setStatusMsg(`Failed to delete course: ${err?.message || err}`);
    }
  }

  async function createBatch(e: FormEvent) {
    e.preventDefault();
    if (!selectedCourseForBatch) {
      setStatusMsg('Please select a course first.');
      return;
    }
    if (!newBatchName.trim()) {
      setStatusMsg('Please enter a batch name.');
      return;
    }
    try {
      await apiFetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBatchName.trim(),
          course_id: selectedCourseForBatch,
        }),
      });
      setNewBatchName('');
      setStatusMsg('Batch created successfully!');
      refetchBatches();
    } catch (err: any) {
      setStatusMsg(`Failed to create batch: ${err?.message || err}`);
    }
  }

  async function deleteBatch(id: string) {
    if (!window.confirm('Delete this batch?')) return;
    try {
      await apiFetch(`/api/batches/${id}`, { method: 'DELETE' });
      setStatusMsg('Batch deleted successfully.');
      refetchBatches();
    } catch (err: any) {
      setStatusMsg(`Failed to delete batch: ${err?.message || err}`);
    }
  }

  async function createTiming(e: FormEvent) {
    e.preventDefault();
    if (!selectedBatchForTiming) {
      setStatusMsg('Please select a batch first.');
      return;
    }
    if (!newStartTime.trim() || !newEndTime.trim()) {
      setStatusMsg('Please provide both start time and end time (e.g. 2:00 PM and 3:00 PM).');
      return;
    }
    try {
      await apiFetch('/api/timings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: selectedBatchForTiming,
          start_time: newStartTime.trim(),
          end_time: newEndTime.trim(),
        }),
      });
      setNewStartTime('');
      setNewEndTime('');
      setStatusMsg('Timing assigned to batch successfully!');
      refetchTimings();
    } catch (err: any) {
      setStatusMsg(`Failed to create timing: ${err?.message || err}`);
    }
  }

  async function deleteTiming(id: string) {
    if (!window.confirm('Delete this timing?')) return;
    try {
      await apiFetch(`/api/timings/${id}`, { method: 'DELETE' });
      setStatusMsg('Timing deleted successfully.');
      refetchTimings();
    } catch (err: any) {
      setStatusMsg(`Failed to delete timing: ${err?.message || err}`);
    }
  }

  return (
    <div className="courses-batches-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', padding: '1rem 0' }}>
      {statusMsg && (
        <div style={{ gridColumn: '1 / -1', padding: '0.8rem', background: 'hsl(var(--accent))', borderRadius: '0.5rem', fontWeight: 500 }}>
          {statusMsg}
        </div>
      )}

      <section className="academy-surface" style={{ padding: '1.25rem', borderRadius: '0.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={18} /> Manage Courses
        </h3>
        <form onSubmit={createCourse} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <input
            className="academy-input"
            placeholder="Course Name (e.g. English Language)"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
          />
          <input
            className="academy-input"
            placeholder="Description (Optional)"
            value={newCourseDesc}
            onChange={(e) => setNewCourseDesc(e.target.value)}
          />
          <button type="submit" className="academy-btn academy-btn-primary academy-btn-small">
            <Plus size={14} /> Add Course
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {courses.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}>
              <div>
                <strong>{c.name}</strong>
                {c.description && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{c.description}</div>}
              </div>
              <button type="button" onClick={() => deleteCourse(c.id)} className="icon-btn" style={{ color: 'hsl(var(--destructive))' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {courses.length === 0 && <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>No custom courses yet (using default presets).</div>}
        </div>
      </section>

      <section className="academy-surface" style={{ padding: '1.25rem', borderRadius: '0.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} /> Manage Batches
        </h3>
        <form onSubmit={createBatch} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <FormSelect
            id="courseForBatch"
            label="Course"
            value={selectedCourseForBatch}
            onValueChange={setSelectedCourseForBatch}
            placeholder="Select a course (required)"
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
          />
          <input
            className="academy-input"
            placeholder="Batch Name (e.g. Basic, Advance, Weekend)"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
          />
          <button type="submit" className="academy-btn academy-btn-primary academy-btn-small">
            <Plus size={14} /> Add Batch
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {batches.map((b) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}>
              <div>
                <strong>{b.name}</strong>
              </div>
              <button type="button" onClick={() => deleteBatch(b.id)} className="icon-btn" style={{ color: 'hsl(var(--destructive))' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {batches.length === 0 && <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>No custom batches yet (using default presets).</div>}
        </div>
      </section>

      <section className="academy-surface" style={{ padding: '1.25rem', borderRadius: '0.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock3 size={18} /> Batch Timings
        </h3>
        <form onSubmit={createTiming} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <FormSelect
            id="batchForTiming"
            label="Batch"
            value={selectedBatchForTiming}
            onValueChange={setSelectedBatchForTiming}
            placeholder="Select a batch"
            options={batches.map((b) => ({ value: b.id, label: b.name }))}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input
              className="academy-input"
              placeholder="Start Time (2:00 PM)"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
            />
            <input
              className="academy-input"
              placeholder="End Time (3:00 PM)"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
            />
          </div>
          <button type="submit" className="academy-btn academy-btn-primary academy-btn-small">
            <Plus size={14} /> Assign Time
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {timings.map((t) => {
            const batchName = batches.find((b) => b.id === t.batch_id)?.name || 'General';
            return (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}>
                <div>
                  <strong>{batchName}</strong>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{t.start_time} - {t.end_time}</div>
                </div>
                <button type="button" onClick={() => deleteTiming(t.id)} className="icon-btn" style={{ color: 'hsl(var(--destructive))' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
          {timings.length === 0 && <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>No custom timings set yet.</div>}
        </div>
      </section>
    </div>
  );
}

function AdminUsersPanel() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [clerkId, setClerkId] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [statusMsg, setStatusMsg] = useState('');

  const { data: admins = [], refetch } = useQuery<AdminItem[]>({
    queryKey: ['admins'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/admins');
        return Array.isArray(res) ? res : (res?.admins || []);
      } catch {
        return [];
      }
    },
  });

  async function createAdminUser(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    try {
      await apiFetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          clerk_id: clerkId.trim() || undefined,
          role,
        }),
      });
      setName('');
      setEmail('');
      setClerkId('');
      setStatusMsg('Admin added successfully!');
      refetch();
    } catch {
      setStatusMsg('Failed to add admin user');
    }
  }

  async function deleteAdminUser(id: string) {
    if (!window.confirm('Remove this admin?')) return;
    try {
      await apiFetch(`/api/admins/${id}`, { method: 'DELETE' });
      refetch();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="admin-users-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', padding: '1rem 0' }}>
      {statusMsg && (
        <div style={{ gridColumn: '1 / -1', padding: '0.8rem', background: 'hsl(var(--accent))', borderRadius: '0.5rem', fontWeight: 500 }}>
          {statusMsg}
        </div>
      )}

      <section className="academy-surface" style={{ padding: '1.25rem', borderRadius: '0.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} /> Add Admin User
        </h3>
        <form onSubmit={createAdminUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            className="academy-input"
            placeholder="Full Name (e.g. Sohail Ali)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="academy-input"
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="academy-input"
            placeholder="Clerk User ID (e.g. user_xxx)"
            value={clerkId}
            onChange={(e) => setClerkId(e.target.value)}
          />
          <FormSelect
            id="adminRole"
            label="Role"
            value={role}
            onValueChange={(v) => setRole(v as 'admin' | 'super_admin')}
            placeholder="Select role"
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'super_admin', label: 'Super Admin' },
            ]}
          />
          <button type="submit" className="academy-btn academy-btn-primary academy-btn-small">
            <Plus size={14} /> Add Admin
          </button>
        </form>
      </section>

      <section className="academy-surface" style={{ padding: '1.25rem', borderRadius: '0.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} /> Existing Staff
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {admins.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}>
              <div>
                <strong>{a.name}</strong> <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', background: 'hsl(var(--primary))', color: '#000', borderRadius: '0.25rem', marginLeft: '0.3rem' }}>{a.role}</span>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{a.email}</div>
                {a.clerk_id && <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Clerk: {a.clerk_id}</div>}
              </div>
              <button type="button" onClick={() => deleteAdminUser(a.id)} className="icon-btn" style={{ color: 'hsl(var(--destructive))' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {admins.length === 0 && <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>No additional admins in database.</div>}
        </div>
      </section>
    </div>
  );
}

function AdminDashboard() {
  const [tab, setTab] = useState<'records' | 'courses' | 'admins'>('records');
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('all');
  const [batch, setBatch] = useState('all');
  const [time, setTime] = useState('all');
  const [quick, setQuick] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search autocomplete suggestion state
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: dbCourses = [] } = useQuery<CourseItem[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/courses');
        return Array.isArray(res) ? res : (res?.courses || []);
      } catch {
        return [];
      }
    },
  });

  const { data: dbBatches = [] } = useQuery<BatchItem[]>({
    queryKey: ['batches'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/batches');
        return Array.isArray(res) ? res : (res?.batches || []);
      } catch {
        return [];
      }
    },
  });

  const { data: dbTimings = [] } = useQuery<TimingItem[]>({
    queryKey: ['timings'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/timings');
        return Array.isArray(res) ? res : (res?.timings || []);
      } catch {
        return [];
      }
    },
  });

  const params = useMemo(() => ({ search: search || undefined, batch: batch === 'all' ? undefined : batch, time: time === 'all' ? undefined : time, limit: 500 }), [search, batch, time]);
  const { data: students = [], isLoading, isError, refetch } = useListStudents(params, { query: { queryKey: getListStudentsQueryKey(params), refetchOnWindowFocus: true, refetchInterval: 15000 } });
  const { data: allStudents, isError: allStudentsError } = useListStudents({ limit: 500 }, { query: { queryKey: getListStudentsQueryKey({ limit: 500 }), refetchOnWindowFocus: true, refetchInterval: 15000 } });
  const { data: summary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey(), refetchOnWindowFocus: true, refetchInterval: 15000 } });

  const analytics = useMemo(() => {
    if (allStudents && !allStudentsError) return summarizeStudents(allStudents);
    return summary ?? summarizeStudents([]);
  }, [allStudents, allStudentsError, summary]);

  // Dynamic Course options
  const courseOptions = useMemo(() => {
    const activeCourses = dbCourses.filter((c) => c.is_active !== false);
    return [
      { value: 'all', label: 'All Courses' },
      ...activeCourses.map((c) => ({ value: c.name, label: c.name })),
    ];
  }, [dbCourses]);

  // Dynamic Batch options (filtered by selected Course)
  const validBatchesForCourse = useMemo(() => {
    const activeBatches = dbBatches.filter((b) => b.is_active !== false);
    if (course === 'all') {
      return activeBatches;
    }
    const courseObj = dbCourses.find((c) => c.name.toLowerCase() === course.toLowerCase());
    if (!courseObj) return [];
    return activeBatches.filter((b) => b.course_id === courseObj.id);
  }, [course, dbCourses, dbBatches]);

  const batchOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Batches' },
      ...validBatchesForCourse.map((b) => ({ value: b.name, label: b.name })),
    ];
  }, [validBatchesForCourse]);

  // Dynamic Time options (filtered by selected Batch or Course)
  const validTimings = useMemo(() => {
    const activeTimings = dbTimings.filter((t) => t.is_active !== false);
    if (batch !== 'all') {
      const batchObj = validBatchesForCourse.find((b) => b.name.toLowerCase() === batch.toLowerCase())
        || dbBatches.find((b) => b.name.toLowerCase() === batch.toLowerCase());
      if (!batchObj) return [];
      return activeTimings.filter((t) => t.batch_id === batchObj.id);
    }
    if (course !== 'all') {
      const validBatchIds = new Set(validBatchesForCourse.map((b) => b.id));
      return activeTimings.filter((t) => validBatchIds.has(t.batch_id || ''));
    }
    return activeTimings;
  }, [course, batch, validBatchesForCourse, dbBatches, dbTimings]);

  const timeOptions = useMemo(() => {
    const formattedTimes = [...new Set(validTimings.map((t) => `${t.start_time} - ${t.end_time}`))].sort();
    return [
      { value: 'all', label: 'All Times' },
      ...formattedTimes.map((t) => ({ value: t, label: t })),
    ];
  }, [validTimings]);

  // Cascading reset handlers
  const handleCourseChange = (newCourse: string) => {
    setCourse(newCourse);
    setQuick('all');

    let nextBatch = batch;
    if (newCourse === 'all') {
      const exists = dbBatches.some((b) => b.is_active !== false && b.name.toLowerCase() === batch.toLowerCase());
      if (batch !== 'all' && !exists) {
        nextBatch = 'all';
        setBatch('all');
      }
    } else {
      const newCourseObj = dbCourses.find((c) => c.name.toLowerCase() === newCourse.toLowerCase());
      const validForNewCourse = newCourseObj
        ? dbBatches.some((b) => b.is_active !== false && b.course_id === newCourseObj.id && b.name.toLowerCase() === batch.toLowerCase())
        : false;
      if (batch !== 'all' && !validForNewCourse) {
        nextBatch = 'all';
        setBatch('all');
      }
    }

    if (time !== 'all') {
      let isTimeValid = false;
      if (nextBatch !== 'all') {
        const batchObj = dbBatches.find((b) => b.is_active !== false && b.name.toLowerCase() === nextBatch.toLowerCase());
        if (batchObj) {
          isTimeValid = dbTimings.some((t) => t.is_active !== false && t.batch_id === batchObj.id && `${t.start_time} - ${t.end_time}` === time);
        }
      } else if (newCourse !== 'all') {
        const newCourseObj = dbCourses.find((c) => c.name.toLowerCase() === newCourse.toLowerCase());
        if (newCourseObj) {
          const courseBatchIds = new Set(dbBatches.filter((b) => b.is_active !== false && b.course_id === newCourseObj.id).map((b) => b.id));
          isTimeValid = dbTimings.some((t) => t.is_active !== false && courseBatchIds.has(t.batch_id || '') && `${t.start_time} - ${t.end_time}` === time);
        }
      } else {
        isTimeValid = dbTimings.some((t) => t.is_active !== false && `${t.start_time} - ${t.end_time}` === time);
      }
      if (!isTimeValid) {
        setTime('all');
      }
    }
  };

  const handleBatchChange = (newBatch: string) => {
    setBatch(newBatch);
    setQuick('all');

    if (time !== 'all') {
      let isTimeValid = false;
      if (newBatch !== 'all') {
        const batchObj = dbBatches.find((b) => b.is_active !== false && b.name.toLowerCase() === newBatch.toLowerCase());
        if (batchObj) {
          isTimeValid = dbTimings.some((t) => t.is_active !== false && t.batch_id === batchObj.id && `${t.start_time} - ${t.end_time}` === time);
        }
      } else if (course !== 'all') {
        const courseObj = dbCourses.find((c) => c.name.toLowerCase() === course.toLowerCase());
        if (courseObj) {
          const courseBatchIds = new Set(dbBatches.filter((b) => b.is_active !== false && b.course_id === courseObj.id).map((b) => b.id));
          isTimeValid = dbTimings.some((t) => t.is_active !== false && courseBatchIds.has(t.batch_id || '') && `${t.start_time} - ${t.end_time}` === time);
        }
      } else {
        isTimeValid = dbTimings.some((t) => t.is_active !== false && `${t.start_time} - ${t.end_time}` === time);
      }
      if (!isTimeValid) {
        setTime('all');
      }
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    setQuick('all');
  };

  // Search suggestions calculation from client-loaded student data
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const source = allStudents && allStudents.length > 0 ? allStudents : students;
    const matches = new Set<string>();
    
    // Direct studentName match
    for (const s of source) {
      if (s.studentName && s.studentName.toLowerCase().includes(q)) {
        matches.add(s.studentName.trim());
      }
      if (matches.size >= 8) break;
    }
    
    // Secondary searchable fields
    if (matches.size < 6) {
      for (const s of source) {
        if (s.schoolCollege && s.schoolCollege.toLowerCase().includes(q)) {
          matches.add(s.studentName.trim());
        } else if (s.contactNumber && s.contactNumber.includes(q)) {
          matches.add(s.studentName.trim());
        }
        if (matches.size >= 8) break;
      }
    }
    return Array.from(matches).slice(0, 8);
  }, [search, allStudents, students]);

  // Click outside to dismiss search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsSuggestionsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        setSearch(suggestions[highlightedIndex]);
        setIsSuggestionsOpen(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsSuggestionsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setSearch(suggestion);
    setIsSuggestionsOpen(false);
    setHighlightedIndex(-1);
  };

  const visibleStudents = useMemo(() => students.filter((student) => {
    if (course !== 'all' && student.courseSubject !== course) return false;
    if (batch !== 'all' && student.batch !== batch) return false;
    if (time !== 'all' && student.time !== time) return false;
    if (quick === 'today') return student.dateOfAdmission?.slice(0, 10) === TODAY;
    if (quick !== 'all' && quick !== 'today') return student.batch === quick;
    return true;
  }), [students, course, batch, time, quick]);

  function exportStudents() {
    const header = ['Reference', 'Student name', 'Current class', 'School / college', 'Contact', 'Date of birth', 'Admission date', 'Gender', 'Address', 'Course', 'Batch', 'Time', 'How heard about us'];
    const rows = visibleStudents.map((student) => [student.id, student.studentName, student.currentClass, student.schoolCollege, student.contactNumber, student.dateOfBirth, student.dateOfAdmission, student.gender, student.homeAddress, student.courseSubject, student.batch, student.time, student.howHeardAboutUs]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bs-english-students-${TODAY}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="academy-app admin-shell">
      <AdminSidebar currentTab={tab} onSelectTab={(t) => setTab(t as any)} />
      <main className="admin-main">
        <motion.header className="admin-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
          <div><div className="academy-eyebrow">Student operations · Larkana</div><h1>Good morning, admissions team.</h1><p>Every new learner deserves a thoughtful first welcome.</p></div>
          <div className="header-actions"><ThemeToggle /><button type="button" className="academy-btn academy-btn-primary academy-btn-small" onClick={exportStudents} data-testid="button-export-students"><Download size={14} /> Export</button></div>
        </motion.header>

        {tab === 'records' && (
          <>
            <section className="summary-grid" aria-label="Enrollment summary">
              {[{ label: 'Total students', value: analytics.totalStudents, foot: 'All active records', icon: Users, primary: true }, { label: 'Today admissions', value: analytics.todayAdmissions, foot: 'Freshly received', icon: UserCheck }, { label: 'Classes on the desk', value: analytics.timeCounts.filter((item) => item.count > 0).length, foot: 'Time windows in use', icon: Clock3 }, { label: 'Courses chosen', value: analytics.courseCounts.length, foot: 'Learning pathways', icon: BookOpen }].map((stat, index) => (
                <motion.div className={`academy-surface summary-card ${stat.primary ? 'primary' : ''}`} key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replaceAll(' ', '-')}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, delay: index * .06 }}>
                  <div className="stat-caption">{stat.label}</div><div className="stat-number">{stat.value}</div><div className="stat-foot">{stat.foot}</div><stat.icon size={18} style={{ position: 'absolute', top: '1rem', right: '1rem', opacity: .55 }} />
                </motion.div>
              ))}
            </section>
            <div className="dashboard-columns">
              <motion.section className="academy-surface student-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: .18 }}>
                <div className="panel-head"><div><h2>Enrollment records</h2><p>{visibleStudents.length} record{visibleStudents.length === 1 ? '' : 's'} shown</p></div><div className="academy-eyebrow">Live desk</div></div>
                <div className="filter-wrap">
                  <div className="filter-search" ref={searchContainerRef}>
                    <Search size={15} />
                    <input
                      type="search"
                      className="academy-input"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setIsSuggestionsOpen(true);
                        setHighlightedIndex(-1);
                      }}
                      onFocus={() => {
                        if (search.trim().length > 0) {
                          setIsSuggestionsOpen(true);
                        }
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search by student name…"
                      data-testid="input-search-students"
                      autoComplete="off"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setIsSuggestionsOpen(false);
                          setHighlightedIndex(-1);
                        }}
                        className="search-clear-btn"
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                    {isSuggestionsOpen && suggestions.length > 0 && (
                      <div className="search-suggestions-box" role="listbox">
                        {suggestions.map((item, index) => (
                          <button
                            key={item}
                            type="button"
                            className={`search-suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectSuggestion(item);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            role="option"
                            aria-selected={index === highlightedIndex}
                          >
                            <Search size={13} className="search-suggestion-icon" />
                            <span className="search-suggestion-text">{item}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <FilterSelect id="filterCourse" value={course} onValueChange={handleCourseChange} placeholder="All courses" options={courseOptions} testId="select-filter-course" />
                  <FilterSelect id="filterBatch" value={batch} onValueChange={handleBatchChange} placeholder="All batches" options={batchOptions} testId="select-filter-batch" />
                  <FilterSelect id="filterTime" value={time} onValueChange={handleTimeChange} placeholder="All times" options={timeOptions} testId="select-filter-time" />
                </div>
                <div style={{ padding: '.8rem 1.15rem 0' }}>
                  <div className="quick-views">
                    <button type="button" className={quick === 'all' ? 'active' : ''} onClick={() => setQuick('all')} data-testid="button-quick-all"><ListFilter size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />All records</button>
                    <button type="button" className={quick === 'today' ? 'active' : ''} onClick={() => setQuick('today')} data-testid="button-quick-today"><CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Today</button>
                    {[...new Set(students.map(s => s.batch))].sort().map((item: string) => <button type="button" className={quick === item ? 'active' : ''} onClick={() => setQuick(item)} data-testid={`button-quick-${item.toLowerCase().replaceAll(' ', '-')}`} key={item}>{item === 'Free Batch' ? 'Free batch' : `${item} batch`}</button>)}
                  </div>
                </div>
                <div className="student-table-wrap academy-scrollbar">
                  {isLoading ? <div style={{ padding: '1rem' }} data-testid="skeleton-student-list">{[1, 2, 3, 4].map((item) => <div key={item} className="academy-skeleton" style={{ height: 48, borderRadius: '.45rem', marginBottom: '.45rem' }} />)}</div> : isError ? <div className="error-state" data-testid="error-student-list"><CircleAlert size={28} /><strong>Couldn’t load the enrollment desk</strong><span>Check the connection and try again.</span><br /><button type="button" className="academy-btn academy-btn-outline academy-btn-small" onClick={() => refetch()} data-testid="button-retry-students">Try again</button></div> : visibleStudents.length === 0 ? <div className="empty-state" data-testid="empty-student-list"><ClipboardList size={30} /><strong>No enrollment records match</strong><span>Try a different filter or add the first learner.</span></div> : (
                    <table className="student-table"><thead><tr><th>Student</th><th>Course</th><th>Batch</th><th>Admission</th><th aria-label="Actions" /></tr></thead><tbody>{visibleStudents.map((student) => <StudentRow key={student.id} student={student} onOpen={setSelectedId} />)}</tbody></table>
                  )}
                </div>
              </motion.section>
              <motion.aside className="side-stack" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: .26 }}>
                <AnalyticsChart title="Batch mix" data={analytics.batchCounts} />
                <AnalyticsChart title="Class times" data={analytics.timeCounts} />
                <AnalyticsChart title="Course demand" data={analytics.courseCounts} />
                <section className="academy-surface tip-card"><Lightbulb size={18} /><h3>A small desk habit</h3><p>Confirm the family preferred time before the first class. A clear welcome sets the rhythm for the whole term.</p></section>
              </motion.aside>
            </div>
          </>
        )}

        {tab === 'courses' && <CoursesAndBatchesPanel />}
        {tab === 'admins' && <AdminUsersPanel />}

        <AcademyContactFooter />
      </main>
      {selectedId && <StudentModal studentId={selectedId} onClose={() => setSelectedId(null)} onChanged={() => refetch()} />}
    </div>
  );
}

function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return <div className="academy-app auth-shell"><div className="academy-surface auth-loading">Loading admissions desk…</div></div>;
  }
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <AdminDashboard />;
}

function SignInPage() {
  return (
    <div className="auth-shell">
      <div className="clerk-frame academy-surface academy-fade-in">
        <SignIn routing="path" path={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={EnrollmentPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProvider
        publishableKey={clerkPubKey}
        appearance={clerkAppearance}
        signInUrl={`${basePath}/sign-in`}
        routerPush={(to) => window.history.pushState({}, '', stripBase(to))}
        routerReplace={(to) => window.history.replaceState({}, '', stripBase(to))}
      >
        <ApiConfiguration />
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </WouterRouter>
  );
}

export default App;
