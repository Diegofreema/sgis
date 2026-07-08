import { FadeIn } from "@/components/animations/FadeIn";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqSections = [
  {
    title: "Admissions",
    items: [
      {
        q: "When does admission begin?",
        a: "Admissions open every January for the new academic session which starts in September, but entrance examinations usually start from March. For mid-session transfers, applications are subject to space availability. If space is available, we administer an assessment test for class placement.",
      },
      {
        q: "What is the admission process?",
        a: "Pick up and complete the admission form online or at the school for a token price. Submit the required documents with the completed form. The candidate attends the entrance examination and interview if successful. The school prospectus is issued and an admission letter is given after full registration.",
      },
      {
        q: "What are the documents required for admission?",
        a: "Birth certificate, last school report card or transfer certificate, 4 passport photos, medical report, and contact information of parent or guardian.",
      },
      {
        q: "Is there an entrance examination or interview?",
        a: "Yes, applicants write an entrance examination and have an interactive interview with the admission team. We assess readiness, not just scores.",
      },
      {
        q: "Can students transfer from another school?",
        a: "Yes. We review last report cards, conduct a placement test, and confirm space in the class. Transfer is more acceptable at the beginning of a term.",
      },
    ],
  },
  {
    title: "Academics",
    items: [
      {
        q: "What curriculum does the school offer?",
        a: "We follow the Nigerian/British curriculum and offer foreign languages like German and French. We write WAEC and NECO, with IGCSE and SAT options. We focus on critical thinking, not just exams.",
      },
      {
        q: "What are the school hours?",
        a: "Secondary boarding time runs from 6:00am to 9:30pm with supervised preps, meals, games, and weekend activities. Students go home at mid-term breaks and the end of every term. Nursery and Primary hours are 7:20am to 2:30pm, Monday through Friday.",
      },
      {
        q: "What is the teacher-to-student ratio?",
        a: "The ratio is 1:25, with a maximum of 25 students in a class. This helps teachers give every child attention, answer questions, and carry struggling learners along.",
      },
      {
        q: "How do you support struggling learners?",
        a: "We offer remedial and intervention classes, after-school coaching, and a special learning support program called SNAP (Special Need Academic Program). Teachers track progress and communicate one-to-one with learners. Parents are contacted early when a child needs extra help.",
      },
    ],
  },
  {
    title: "Fees and Payments",
    items: [
      {
        q: "What are the school fees?",
        a: "Fees vary by class or section and cover tuition, boarding, uniforms, and basic learning materials. Detailed fee information is provided during the admission process.",
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept bank transfer, POS at the bursary, and online payment via our portal. Receipts are issued for all payments.",
      },
      {
        q: "Are there payment plans available?",
        a: "Yes. Payment can be made in 2 instalments based on personal agreement with the school. We encourage early payment of fees.",
      },
      {
        q: "Are there any additional fees apart from tuition?",
        a: "Yes, only when applicable: boarding fee, uniforms, textbooks, external exam registration such as WAEC, NECO, IGCSE, SAT, and school trips or excursions. We provide a full breakdown before each term.",
      },
    ],
  },
  {
    title: "Extracurricular Activities",
    items: [
      {
        q: "What are the available sports and clubs?",
        a: "Students and pupils have access to football, basketball, volleyball, badminton, athletics, table tennis, chess, scrabble, debate, STEM club, JET club, Performing Art club, Home Economics club, Young Farmers club, and coding club. New clubs open based on students' interests.",
      },
      {
        q: "Do students participate in competitions?",
        a: "Yes. The school promotes inter-school sports competitions, science fairs, spelling bees, debate championships, arts festivals, and other external competitions at state and national levels.",
      },
      {
        q: "Are there music, arts, and cultural activities?",
        a: "Definitely. We have choir, instrumental lessons, art exhibitions, cultural day celebration, parade lessons, and drama productions. These help instill discipline and build confidence and creativity alongside academics.",
      },
    ],
  },
  {
    title: "School Policies",
    items: [
      {
        q: "What is the school's attendance policy?",
        a: "Punctuality and regular attendance are compulsory. Absence from any activity must have express permission from the relevant authority.",
      },
      {
        q: "What is the discipline policy?",
        a: "We use positive discipline: clear rules, counselling, and corrective tasks before sanctions such as suspension or expulsion. Bullying, fighting, and exam malpractice have zero tolerance. Boarders have additional house rules, and parents are involved when serious issues arise.",
      },
      {
        q: "What is the policy on bullying?",
        a: "Bullying in any form, physical or verbal, is not allowed. Students can report to house masters, teachers, sectional heads, or any management authority. We investigate quickly, support victims, and apply corrective measures to offenders.",
      },
      {
        q: "What is the school's policy on the use of mobile phones?",
        a: "Phones are allowed only on weekends and during set hours for communication with parents or guardians under house supervision. General mobile phone use by students is not allowed.",
      },
    ],
  },
  {
    title: "Transportation",
    items: [
      {
        q: "Does the school provide bus services?",
        a: "Yes, mostly for Nursery and Primary pupils. Transport during mid-term breaks and holidays can be organized for students returning home at the request of parents or guardians.",
      },
      {
        q: "Which areas are covered by the school buses?",
        a: "We cover the whole of Owerri West LGA and Owerri Municipal when necessary.",
      },
      {
        q: "How is student safety ensured during transportation?",
        a: "Our school buses have trained drivers, student minders, and GPS tracking. Buses are maintained regularly. Attendance is controlled before departure and on arrival.",
      },
    ],
  },
  {
    title: "Health and Safety",
    items: [
      {
        q: "Is there a school nurse or sick bay?",
        a: "Yes. We have a full-time nurse and a sick bay for first aid and minor illnesses. Serious cases are referred to a partner hospital with parent consent.",
      },
      {
        q: "What safety measures are in place?",
        a: "We have 24-hour security, CCTV on campus, fire safety drills, and restricted visitor access. Boarding houses have house chaperones and matrons on duty daily. We teach students safety and emergency procedures each term.",
      },
      {
        q: "How does the school handle emergencies?",
        a: "Parents or guardians are contacted immediately. The sick bay handles first aid, then transfer to hospital follows if needed.",
      },
    ],
  },
  {
    title: "Recruitment of Teachers",
    items: [
      {
        q: "Does the school recruit teachers?",
        a: "Yes. We recruit qualified, experienced, and passionate teachers who are committed to academic excellence and holistic learner development.",
      },
      {
        q: "How does the school advertise for teachers' recruitment?",
        a: "Vacancies are advertised as they arise, and interested applicants are encouraged to submit applications with relevant credentials.",
      },
      {
        q: "What are the requirements for teacher recruitment?",
        a: "Applicants should have required academic qualifications, relevant teaching experience, good communication skills, strong moral character, and a genuine passion for teaching. Successful candidates must also perform well in the school's recruitment process, which may include written assessments, demonstration lessons, and interviews.",
      },
      {
        q: "Does the school provide training for teachers?",
        a: "Yes. Teachers regularly participate in workshops, seminars, in-house training sessions, and educational conferences to improve their teaching skills and stay current with modern educational practice.",
      },
      {
        q: "How often are teachers trained?",
        a: "Teacher training is conducted periodically throughout the academic year. Additional training is organized whenever there are curriculum updates, new teaching methods, or technological innovations that improve classroom instruction.",
      },
    ],
  },
  {
    title: "Recruitment of Non-Academic Staff",
    items: [
      {
        q: "Does the school recruit non-academic staff?",
        a: "Yes. We recruit competent and dedicated non-academic staff for administrative, hostel, security, maintenance, ICT, transport, and other support services. Recruitment is based on qualifications, competence, integrity, and suitability.",
      },
      {
        q: "What are the requirements for non-academic staff recruitment?",
        a: "Applicants must have appropriate qualifications and relevant work experience for the position. They are expected to demonstrate professionalism, good interpersonal skills, integrity, and willingness to contribute to the school's mission.",
      },
      {
        q: "Are non-academic staff members trained?",
        a: "Yes. All non-academic staff receive orientation upon employment and join regular training on customer service, workplace ethics, health and safety, child protection, emergency response, and efficient service delivery.",
      },
      {
        q: "How can I apply for teaching or non-teaching positions?",
        a: "Interested applicants can submit an application letter, CV, and relevant credentials to the school's administrative office or through the official recruitment portal or email whenever vacancies are announced.",
      },
      {
        q: "Does the school employ only experienced staff?",
        a: "Experience is an added advantage, but we also consider qualified and promising candidates who show competence, willingness to learn, and alignment with the school's vision and values.",
      },
      {
        q: "Does the school conduct background checks before employment?",
        a: "Yes. All successful applicants undergo screening and reference verification to ensure they meet the school's standards of professionalism, integrity, and child safeguarding before employment.",
      },
    ],
  },
];

export function FAQPage() {
  return (
    <>
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-3xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">
              Frequently Asked Questions
            </p>
            <h1 className="mb-6 text-h1 font-serif font-bold leading-tight text-foreground">
              Answers for parents, students, and applicants.
            </h1>
            <p className="text-xl leading-relaxed text-muted-foreground">
              Find quick answers about admissions, academics, fees, policies,
              transportation, health and safety, and recruitment.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto container-padding">
          <div className="mx-auto flex max-w-4xl flex-col gap-10">
            {faqSections.map((section) => (
              <FadeIn key={section.title}>
                <div className="flex flex-col gap-4">
                  <h2 className="text-h3 font-serif font-bold text-foreground">
                    {section.title}
                  </h2>
                  <Accordion
                    multiple
                    className="rounded-xl border border-border bg-card px-5 shadow-brand-sm"
                  >
                    {section.items.map((item) => (
                      <AccordionItem key={item.q} value={item.q}>
                        <AccordionTrigger>{item.q}</AccordionTrigger>
                        <AccordionContent>{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
