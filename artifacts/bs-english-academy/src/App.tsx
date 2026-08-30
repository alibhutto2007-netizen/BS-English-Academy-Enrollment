import { Fragment, type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
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
  Lightbulb,
  ListFilter,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey,
  getGetStudentQueryKey,
  getHealthCheckQueryKey,
  getListStudentsQueryKey,
  useCreateStudent,
  useDeleteStudent,
  useGetDashboardSummary,
  useGetStudent,
  useHealthCheck,
  useListStudents,
  useUpdateStudent,
  type Student,
  type StudentInput,
} from '@workspace/api-client-react';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth,
  useClerk,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { DatePickerField, FormSelect, NameInput, NumericInput } from '@/components/academy-form-controls';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { isValidDateValue, parseLocalDate, sanitizeName, sanitizePhone, toLocalDateValue } from '@/lib/input-sanitizers';

const queryClient = new QueryClient();
const TODAY = toLocalDateValue(new Date());
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const academyLogo = `${basePath}/logo.svg`;
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const BATCHES = ['Basic', 'Advance', 'Medium'] as const;
const TIMES = ['2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM', '5:00 PM - 6:00 PM'] as const;
const BATCH_TIMES: Record<(typeof BATCHES)[number], readonly (typeof TIMES)[number][]> = {
  Basic: ['2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM'],
  Medium: ['3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM'],
  Advance: ['4:00 PM - 5:00 PM', '5:00 PM - 6:00 PM'],
};
const COURSE_OPTIONS = [
  { value: 'English Language', label: 'English Language' },
  { value: 'Spoken English', label: 'Spoken English' },
  { value: 'Grammar & Writing', label: 'Grammar & Writing' },
  { value: 'IELTS Preparation', label: 'IELTS Preparation' },
  { value: 'Other Subject', label: 'Other Subject' },
];
const GENDER_OPTIONS = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
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
  courseSubject: 'English Language',
  batch: 'Basic',
  time: '2:00 PM - 3:00 PM',
};

const dateValueSchema = z.string().refine(isValidDateValue, 'Choose a valid date.');
const enrollmentSchema = z.object({
  studentName: z.string().trim().min(2, 'Please enter the student’s full name.').max(120, 'Name is too long.'),
  currentClass: z.string().trim().min(1, 'Please add the current class.').max(80, 'Class is too long.'),
  lastAcademy: z.string().trim().min(1, 'Please add the last academy.').max(160, 'Academy name is too long.'),
  schoolCollege: z.string().trim().min(1, 'Please add the school or college.').max(160, 'Institution name is too long.'),
  contactNumber: z.string().min(7, 'Please enter a valid contact number.').max(15, 'Contact number is too long.'),
  dateOfBirth: dateValueSchema.refine((value) => value <= TODAY, 'Date of birth cannot be in the future.'),
  dateOfAdmission: dateValueSchema,
  gender: z.enum(['Female', 'Male', 'Other']),
  homeAddress: z.string().trim().min(1, 'Please add the home address.').max(500, 'Address is too long.'),
  courseSubject: z.string().trim().min(1, 'Please choose a course subject.').max(120, 'Course subject is too long.'),
  batch: z.enum(['Basic', 'Advance', 'Medium']),
  time: z.enum(['2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM', '5:00 PM - 6:00 PM']),
});

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
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
    fontFamily: 'DM Sans, sans-serif',
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

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup" data-testid="brand-academy">
      <img src={academyLogo} alt="BS English Virtual Academy crest" />
      {!compact && (
        <div>
          <strong>BS English</strong>
          <span>Virtual Academy · Larkana</span>
        </div>
      )}
    </div>
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
  const {
    control,
    register,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentInput>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: EMPTY_FORM,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const selectedBatch = watch('batch');
  const selectedTime = watch('time');
  const availableTimes = BATCH_TIMES[selectedBatch];

  useEffect(() => {
    if (!availableTimes.includes(selectedTime)) {
      setValue('time', availableTimes[0], { shouldValidate: true, shouldDirty: true });
    }
  }, [availableTimes, selectedTime, setValue]);

  async function moveForward() {
    const fields = step === 1
      ? ['studentName', 'contactNumber', 'dateOfBirth', 'gender'] as const
      : ['currentClass', 'lastAcademy', 'schoolCollege', 'homeAddress', 'courseSubject'] as const;
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
    };
    createStudent.mutate({ data: cleanData }, {
      onSuccess: (student) => setSubmitted(student),
      onError: () => setServerError('We could not save this enrollment right now. Please try again.'),
    });
  }

  function handleInvalid(fieldErrors: Record<string, unknown>) {
    const firstError = Object.keys(fieldErrors)[0];
    if (['studentName', 'contactNumber', 'dateOfBirth', 'gender'].includes(firstError)) setStep(1);
    else if (['currentClass', 'lastAcademy', 'schoolCollege', 'homeAddress', 'courseSubject'].includes(firstError)) setStep(2);
    else if (firstError) setStep(3);
  }

  function downloadConfirmation() {
    if (!submitted) return;
    const lines = [
      'BS ENGLISH VIRTUAL ACADEMY — ENROLLMENT CONFIRMATION',
      `Reference: ${submitted.id}`,
      '',
      `Student: ${submitted.studentName}`,
      `Course: ${submitted.courseSubject}`,
      `Batch: ${submitted.batch}`,
      `Time: ${submitted.time}`,
      `Admission date: ${displayDate(submitted.dateOfAdmission)}`,
      `Contact: ${submitted.contactNumber}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bs-english-enrollment-${submitted.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="academy-app enroll-shell">
      <aside className="enroll-rail">
        <Brand />
        <div className="rail-copy academy-fade-in">
          <div className="academy-eyebrow" style={{ color: 'hsl(var(--primary))' }}>Admissions desk · Larkana</div>
          <h1>Start with<br /><em>the right words.</em></h1>
          <p>Tell us a little about the learner. We’ll help you choose a comfortable class rhythm and a clear path forward.</p>
        </div>
        <div className="rail-note">
          <ShieldCheck size={17} />
          <span>Your details are reviewed by the academy team with care. No queues, no paper file to carry.</span>
        </div>
      </aside>
      <main className="enroll-main">
        <div className="top-line">
          <Link href="/admin" data-testid="link-admin-signin">Admin sign in <ChevronRight size={14} /></Link>
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
                          <Field label="Student’s full name" htmlFor="studentName" error={fieldState.error?.message}>
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
                        <FormSelect id="courseSubject" label="Course subject" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} options={COURSE_OPTIONS} testId="select-course-subject" />
                      )}
                    />
                    <div className="form-span">
                      <Field label="Home address" htmlFor="homeAddress" error={errors.homeAddress?.message}>
                        <textarea id="homeAddress" rows={3} className={`academy-input ${errors.homeAddress ? 'invalid' : ''}`} {...register('homeAddress')} placeholder="House, street, area, Larkana" data-testid="textarea-home-address" />
                      </Field>
                    </div>
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
                          <FormSelect id="batch" label="Preferred batch" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} options={BATCHES.map((item) => ({ value: item, label: item }))} testId="select-batch" />
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
                    <p className="field-note">Available timings update with the selected batch.</p>
                    <div className="academy-eyebrow" style={{ margin: '1.5rem 0 .7rem' }}>Review before sending</div>
                    <div className="review-list">
                      <div className="review-item"><span>Student</span><strong>{watch('studentName')}</strong></div>
                      <div className="review-item"><span>Contact</span><strong>{watch('contactNumber')}</strong></div>
                      <div className="review-item"><span>Learning at</span><strong>{watch('schoolCollege')}</strong></div>
                      <div className="review-item"><span>Course</span><strong>{watch('courseSubject')}</strong></div>
                      <div className="review-item"><span>Batch</span><strong>{selectedBatch}</strong></div>
                      <div className="review-item"><span>Class time</span><strong>{selectedTime}</strong></div>
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
              <h2>We’re ready for<br />{submitted.studentName}.</h2>
              <p>The academy team has received the enrollment. Keep this confirmation for your records; we’ll contact you shortly to confirm the first class.</p>
              <div className="success-actions">
                <button type="button" className="academy-btn academy-btn-primary" onClick={downloadConfirmation} data-testid="button-download-confirmation"><Download size={15} /> Download confirmation</button>
                <Link href="/admin" className="academy-btn academy-btn-outline" data-testid="link-open-admin">Open admissions desk <ChevronRight size={15} /></Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminSidebar() {
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  return (
    <aside className="admin-sidebar">
      <Link href="/" data-testid="link-admin-brand"><Brand compact={false} /></Link>
      <nav className="admin-nav" aria-label="Admin navigation">
        <Link href="/admin" className="active" data-testid="link-dashboard"><House size={17} /><span>Admissions desk</span></Link>
        <Link href="/" data-testid="link-new-enrollment"><Plus size={17} /><span>New enrollment</span></Link>
      </nav>
      <div className="admin-sidebar-bottom">
        <button type="button" className="side-action" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-admin-signout"><LogOut size={17} /><span>Sign out of desk</span></button>
      </div>
    </aside>
  );
}

function BarList({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((item) => item.count), 1);
  return (
    <section className="academy-surface chart-card" data-testid={`chart-${title.toLowerCase().replaceAll(' ', '-')}`}>
      <h3>{title}</h3>
      {data.length ? data.map((item) => (
        <div className="bar-row" key={item.label}>
          <span>{item.label.replace(' PM', '')}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(5, (item.count / max) * 100)}%` }} /></div>
          <time>{item.count}</time>
        </div>
      )) : <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.75rem' }}>No enrollments yet.</p>}
    </section>
  );
}

function StudentRow({ student, onOpen }: { student: Student; onOpen: (id: string) => void }) {
  return (
    <tr data-testid={`row-student-${student.id}`}>
      <td><div className="student-name"><span className="initials">{initials(student.studentName)}</span><span>{student.studentName}<span className="cell-sub">{student.currentClass || 'Class not added'}</span></span></div></td>
      <td>{student.courseSubject}<span className="cell-sub">{student.schoolCollege}</span></td>
      <td><span className="batch-tag">{student.batch}</span><span className="cell-sub">{student.time}</span></td>
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

  useEffect(() => {
    if (detail) {
      setEditForm({ ...detail });
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
    updateStudent.mutate({ id: studentId, data: {
      ...parsed.data,
      studentName: sanitizeName(parsed.data.studentName),
      contactNumber: sanitizePhone(parsed.data.contactNumber),
    } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setEditing(false);
        onChanged();
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
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="academy-surface modal-card academy-scrollbar" role="dialog" aria-modal="true" aria-label="Student enrollment detail" data-testid="modal-student-detail">
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
               <FormSelect id="edit-course" label="Course subject" value={editForm.courseSubject} onValueChange={(value) => updateField('courseSubject', value)} error={editErrors.courseSubject} options={COURSE_OPTIONS} testId="select-edit-course" />
               <FormSelect id="edit-batch" label="Batch" value={editForm.batch} onValueChange={(value) => { const nextBatch = value as StudentInput['batch']; updateField('batch', nextBatch); if (!BATCH_TIMES[nextBatch].includes(editForm.time)) updateField('time', BATCH_TIMES[nextBatch][0]); }} error={editErrors.batch} options={BATCHES.map((item) => ({ value: item, label: item }))} testId="select-edit-batch" />
               <FormSelect id="edit-time" label="Class time" value={editForm.time} onValueChange={(value) => updateField('time', value as StudentInput['time'])} error={editErrors.time} options={BATCH_TIMES[editForm.batch].map((item) => ({ value: item, label: item }))} testId="select-edit-time" />
               <DatePickerField id="edit-admission-date" label="Admission date" value={editForm.dateOfAdmission} onValueChange={(value) => updateField('dateOfAdmission', value)} error={editErrors.dateOfAdmission} testId="input-edit-admission-date" />
               <div className="form-span"><Field label="Home address" htmlFor="edit-address" error={editErrors.homeAddress}><textarea id="edit-address" rows={2} className={`academy-input ${editErrors.homeAddress ? 'invalid' : ''}`} value={editForm.homeAddress} onChange={(event) => updateField('homeAddress', event.target.value)} data-testid="textarea-edit-address" /></Field></div>
            </div>
            <div className="form-actions"><button type="button" className="academy-btn academy-btn-outline academy-btn-small" onClick={() => setEditing(false)} data-testid="button-cancel-edit">Cancel</button><button type="submit" className="academy-btn academy-btn-primary academy-btn-small" disabled={updateStudent.isPending} data-testid="button-save-student">{updateStudent.isPending ? 'Saving…' : 'Save changes'} <Check size={14} /></button></div>
          </form>
        )}
      </section>
    </div>
  );
}

function AdminDashboard() {
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('all');
  const [time, setTime] = useState('all');
  const [quick, setQuick] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = useMemo(() => ({ search: search || undefined, batch: batch === 'all' ? undefined : batch, time: time === 'all' ? undefined : time, limit: 500 }), [search, batch, time]);
  const { data: students = [], isLoading, isError, refetch } = useListStudents(params, { query: { queryKey: getListStudentsQueryKey(params) } });
  const { data: summary } = useGetDashboardSummary();
  const { data: health, isError: healthError } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const visibleStudents = useMemo(() => students.filter((student) => {
    if (quick === 'today') return student.dateOfAdmission?.slice(0, 10) === TODAY || student.createdAt?.slice(0, 10) === TODAY;
    if (quick === 'basic') return student.batch === 'Basic';
    if (quick === 'advance') return student.batch === 'Advance';
    return true;
  }), [students, quick]);

  function exportStudents() {
    const header = ['Reference', 'Student name', 'Current class', 'School / college', 'Contact', 'Date of birth', 'Admission date', 'Gender', 'Address', 'Course', 'Batch', 'Time'];
    const rows = visibleStudents.map((student) => [student.id, student.studentName, student.currentClass, student.schoolCollege, student.contactNumber, student.dateOfBirth, student.dateOfAdmission, student.gender, student.homeAddress, student.courseSubject, student.batch, student.time]);
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
      <AdminSidebar />
      <main className="admin-main">
        <header className="admin-header">
          <div><div className="academy-eyebrow">Student operations · Larkana</div><h1>Good morning, admissions team.</h1><p>Every new learner deserves a thoughtful first welcome.</p></div>
          <div className="header-actions"><span className="health-dot" data-testid="status-api-health"><i />{healthError ? 'Offline mode' : health?.status || 'Checking desk'}</span><ThemeToggle /><button type="button" className="academy-btn academy-btn-primary academy-btn-small" onClick={exportStudents} data-testid="button-export-students"><Download size={14} /> Export</button></div>
        </header>
        <section className="summary-grid" aria-label="Enrollment summary">
          {[{ label: 'Total students', value: summary?.totalStudents ?? 0, foot: 'All active records', icon: Users, primary: true }, { label: 'Today’s admissions', value: summary?.todayAdmissions ?? 0, foot: 'Freshly received', icon: UserCheck }, { label: 'Classes on the desk', value: summary?.timeCounts?.reduce((total, item) => total + (item.count ? 1 : 0), 0) ?? 0, foot: 'Time windows in use', icon: Clock3 }, { label: 'Courses chosen', value: summary?.batchCounts?.length ?? 0, foot: 'Learning pathways', icon: BookOpen }].map((stat) => (
            <div className={`academy-surface summary-card ${stat.primary ? 'primary' : ''}`} key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replaceAll(' ', '-')}`}>
              <div className="stat-caption">{stat.label}</div><div className="stat-number">{stat.value}</div><div className="stat-foot">{stat.foot}</div><stat.icon size={18} style={{ position: 'absolute', top: '1rem', right: '1rem', opacity: .55 }} />
            </div>
          ))}
        </section>
        <div className="dashboard-columns">
          <section className="academy-surface student-panel">
            <div className="panel-head"><div><h2>Enrollment records</h2><p>{visibleStudents.length} record{visibleStudents.length === 1 ? '' : 's'} shown</p></div><div className="academy-eyebrow">Live desk</div></div>
            <div className="filter-wrap">
              <div className="filter-search"><Search size={15} /><input type="search" className="academy-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by student name…" data-testid="input-search-students" /></div>
              <select className="academy-input" value={batch} onChange={(event) => { setBatch(event.target.value); setQuick('all'); }} data-testid="select-filter-batch"><option value="all">All batches</option>{BATCHES.map((item) => <option value={item} key={item}>{item}</option>)}</select>
              <select className="academy-input" value={time} onChange={(event) => { setTime(event.target.value); setQuick('all'); }} data-testid="select-filter-time"><option value="all">All times</option>{TIMES.map((item) => <option value={item} key={item}>{item}</option>)}</select>
            </div>
            <div style={{ padding: '.8rem 1.15rem 0' }}><div className="quick-views"><button type="button" className={quick === 'all' ? 'active' : ''} onClick={() => setQuick('all')} data-testid="button-quick-all"><ListFilter size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />All records</button><button type="button" className={quick === 'today' ? 'active' : ''} onClick={() => setQuick('today')} data-testid="button-quick-today"><CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Today</button><button type="button" className={quick === 'basic' ? 'active' : ''} onClick={() => setQuick('basic')} data-testid="button-quick-basic">Basic batch</button><button type="button" className={quick === 'advance' ? 'active' : ''} onClick={() => setQuick('advance')} data-testid="button-quick-advance">Advance batch</button></div></div>
            <div className="student-table-wrap academy-scrollbar">
              {isLoading ? <div style={{ padding: '1rem' }} data-testid="skeleton-student-list">{[1, 2, 3, 4].map((item) => <div key={item} className="academy-skeleton" style={{ height: 48, borderRadius: '.45rem', marginBottom: '.45rem' }} />)}</div> : isError ? <div className="error-state" data-testid="error-student-list"><CircleAlert size={28} /><strong>Couldn’t load the enrollment desk</strong><span>Check the connection and try again.</span><br /><button type="button" className="academy-btn academy-btn-outline academy-btn-small" onClick={() => refetch()} data-testid="button-retry-students">Try again</button></div> : visibleStudents.length === 0 ? <div className="empty-state" data-testid="empty-student-list"><ClipboardList size={30} /><strong>No enrollment records match</strong><span>Try a different filter or add the first learner.</span></div> : (
                <table className="student-table"><thead><tr><th>Student</th><th>Course</th><th>Batch</th><th>Admission</th><th aria-label="Actions" /></tr></thead><tbody>{visibleStudents.map((student) => <StudentRow key={student.id} student={student} onOpen={setSelectedId} />)}</tbody></table>
              )}
            </div>
          </section>
          <aside className="side-stack">
            <BarList title="Batch mix" data={summary?.batchCounts || []} />
            <BarList title="Class times" data={summary?.timeCounts || []} />
            <section className="academy-surface tip-card"><Lightbulb size={18} /><h3>A small desk habit</h3><p>Confirm the family’s preferred time before the first class. A clear welcome sets the rhythm for the whole term.</p></section>
          </aside>
        </div>
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
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="auth-shell">
      <div className="clerk-frame academy-surface academy-fade-in">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
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
        <Route path="/sign-up/*?" component={SignUpPage} />
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
        proxyUrl={clerkProxyUrl}
        appearance={clerkAppearance}
        signInUrl={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        routerPush={(to) => window.history.pushState({}, '', stripBase(to))}
        routerReplace={(to) => window.history.replaceState({}, '', stripBase(to))}
      >
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