import { Fragment, type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
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
  X,
} from 'lucide-react';
import { SiInstagram, SiTiktok, SiWhatsapp } from 'react-icons/si';
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
} from '@workspace/api-client-react';
import {
  ClerkProvider,
  SignIn,
  useAuth,
  useClerk,
} from '@clerk/react';

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
const academyLogo = `${basePath}/logo.png`;
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const BATCHES = ['Basic', 'Advance', 'Medium', 'Free Batch'] as const;
const TIMES = ['2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM', '5:00 PM - 6:00 PM'] as const;
const BATCH_LABELS: Record<(typeof BATCHES)[number], string> = {
  Basic: 'Basic',
  Advance: 'Advance',
  Medium: 'Medium',
  'Free Batch': 'Free Batch (Registration Fee Only)',
};
const BATCH_TIMES: Record<(typeof BATCHES)[number], readonly (typeof TIMES)[number][]> = {
  Basic: ['2:00 PM - 3:00 PM'],
  Advance: ['3:00 PM - 4:00 PM'],
  Medium: ['4:00 PM - 5:00 PM'],
  'Free Batch': ['5:00 PM - 6:00 PM'],
};
const BATCH_OPTIONS = BATCHES.map((value) => ({ value, label: BATCH_LABELS[value] }));
const WHATSAPP_URL = 'https://wa.me/923098575110';
const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=Gareeb+Muqam%2C+near+Big+Fish+Market%2C+Larkana';
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
  batch: z.enum(['Basic', 'Advance', 'Medium', 'Free Batch']),
  time: z.enum(['2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM', '5:00 PM - 6:00 PM']),
}).superRefine((value, context) => {
  if (!BATCH_TIMES[value.batch].includes(value.time)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['time'], message: 'Please choose the timing assigned to this batch.' });
  }
});

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
    return () => setAuthTokenGetter(null);
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
          <span>Virtual Academy · Larkana</span>
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
                        <FormSelect id="batch" label="Preferred batch" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} options={BATCH_OPTIONS} testId="select-batch" />
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

type CountItem = { label: string; count: number };

function summarizeStudents(records: Student[]) {
  const batchCounts = new Map(BATCHES.map((label) => [label, 0]));
  const timeCounts = new Map(TIMES.map((label) => [label, 0]));
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
               <FormSelect id="edit-batch" label="Batch" value={editForm.batch} onValueChange={(value) => { const nextBatch = value as StudentInput['batch']; updateField('batch', nextBatch); if (!BATCH_TIMES[nextBatch].includes(editForm.time)) updateField('time', BATCH_TIMES[nextBatch][0]); }} error={editErrors.batch} options={BATCH_OPTIONS} testId="select-edit-batch" />
               <FormSelect id="edit-time" label="Class time" value={editForm.time} onValueChange={(value) => updateField('time', value as StudentInput['time'])} error={editErrors.time} options={BATCH_TIMES[editForm.batch].map((item) => ({ value: item, label: item }))} testId="select-edit-time" />
               <DatePickerField id="edit-admission-date" label="Admission date" value={editForm.dateOfAdmission} onValueChange={(value) => updateField('dateOfAdmission', value)} error={editErrors.dateOfAdmission} testId="input-edit-admission-date" />
               <div className="form-span"><Field label="Home address" htmlFor="edit-address" error={editErrors.homeAddress}><textarea id="edit-address" rows={2} className={`academy-input ${editErrors.homeAddress ? 'invalid' : ''}`} value={editForm.homeAddress} onChange={(event) => updateField('homeAddress', event.target.value)} data-testid="textarea-edit-address" /></Field></div>
            </div>
            <div className="form-actions"><button type="button" className="academy-btn academy-btn-outline academy-btn-small" onClick={() => setEditing(false)} data-testid="button-cancel-edit">Cancel</button><button type="submit" className="academy-btn academy-btn-primary academy-btn-small" disabled={updateStudent.isPending} data-testid="button-save-student">{updateStudent.isPending ? 'Saving…' : 'Save changes'} <Check size={14} /></button></div>
          </form>
        )}
      </motion.section>
    </motion.div>
  );
}

function AdminDashboard() {
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('all');
  const [time, setTime] = useState('all');
  const [quick, setQuick] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = useMemo(() => ({ search: search || undefined, batch: batch === 'all' ? undefined : batch, time: time === 'all' ? undefined : time, limit: 500 }), [search, batch, time]);
  const { data: students = [], isLoading, isError, refetch } = useListStudents(params, { query: { queryKey: getListStudentsQueryKey(params), refetchOnWindowFocus: true, refetchInterval: 15000 } });
  const { data: allStudents, isError: allStudentsError } = useListStudents({ limit: 500 }, { query: { queryKey: getListStudentsQueryKey({ limit: 500 }), refetchOnWindowFocus: true, refetchInterval: 15000 } });
  const { data: summary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey(), refetchOnWindowFocus: true, refetchInterval: 15000 } });
  const analytics = useMemo(() => {
    if (allStudents && !allStudentsError) return summarizeStudents(allStudents);
    return summary ?? summarizeStudents([]);
  }, [allStudents, allStudentsError, summary]);
  const visibleStudents = useMemo(() => students.filter((student) => {
    if (quick === 'today') return student.dateOfAdmission?.slice(0, 10) === TODAY;
    if (quick !== 'all' && quick !== 'today') return student.batch === quick;
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
        <motion.header className="admin-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
          <div><div className="academy-eyebrow">Student operations · Larkana</div><h1>Good morning, admissions team.</h1><p>Every new learner deserves a thoughtful first welcome.</p></div>
          <div className="header-actions"><ThemeToggle /><button type="button" className="academy-btn academy-btn-primary academy-btn-small" onClick={exportStudents} data-testid="button-export-students"><Download size={14} /> Export</button></div>
        </motion.header>
        <section className="summary-grid" aria-label="Enrollment summary">
          {[{ label: 'Total students', value: analytics.totalStudents, foot: 'All active records', icon: Users, primary: true }, { label: 'Today’s admissions', value: analytics.todayAdmissions, foot: 'Freshly received', icon: UserCheck }, { label: 'Classes on the desk', value: analytics.timeCounts.filter((item) => item.count > 0).length, foot: 'Time windows in use', icon: Clock3 }, { label: 'Courses chosen', value: analytics.courseCounts.length, foot: 'Learning pathways', icon: BookOpen }].map((stat, index) => (
            <motion.div className={`academy-surface summary-card ${stat.primary ? 'primary' : ''}`} key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replaceAll(' ', '-')}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, delay: index * .06 }}>
              <div className="stat-caption">{stat.label}</div><div className="stat-number">{stat.value}</div><div className="stat-foot">{stat.foot}</div><stat.icon size={18} style={{ position: 'absolute', top: '1rem', right: '1rem', opacity: .55 }} />
            </motion.div>
          ))}
        </section>
        <div className="dashboard-columns">
          <motion.section className="academy-surface student-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: .18 }}>
            <div className="panel-head"><div><h2>Enrollment records</h2><p>{visibleStudents.length} record{visibleStudents.length === 1 ? '' : 's'} shown</p></div><div className="academy-eyebrow">Live desk</div></div>
            <div className="filter-wrap">
              <div className="filter-search"><Search size={15} /><input type="search" className="academy-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by student name…" data-testid="input-search-students" /></div>
              <select className="academy-input" value={batch} onChange={(event) => { setBatch(event.target.value); setQuick('all'); }} data-testid="select-filter-batch"><option value="all">All batches</option>{BATCH_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
              <select className="academy-input" value={time} onChange={(event) => { setTime(event.target.value); setQuick('all'); }} data-testid="select-filter-time"><option value="all">All times</option>{TIMES.map((item) => <option value={item} key={item}>{item}</option>)}</select>
            </div>
            <div style={{ padding: '.8rem 1.15rem 0' }}><div className="quick-views"><button type="button" className={quick === 'all' ? 'active' : ''} onClick={() => setQuick('all')} data-testid="button-quick-all"><ListFilter size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />All records</button><button type="button" className={quick === 'today' ? 'active' : ''} onClick={() => setQuick('today')} data-testid="button-quick-today"><CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Today</button>{BATCHES.map((item) => <button type="button" className={quick === item ? 'active' : ''} onClick={() => setQuick(item)} data-testid={`button-quick-${item.toLowerCase().replaceAll(' ', '-')}`} key={item}>{item === 'Free Batch' ? 'Free batch' : `${item} batch`}</button>)}</div></div>
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
            <section className="academy-surface tip-card"><Lightbulb size={18} /><h3>A small desk habit</h3><p>Confirm the family’s preferred time before the first class. A clear welcome sets the rhythm for the whole term.</p></section>
           </motion.aside>
        </div>
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
