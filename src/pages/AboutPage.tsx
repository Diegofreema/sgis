import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { AdmissionCTA } from "@/components/public/AdmissionCTA";
import {
  BookOpen,
  Globe,
  Heart,
  Users,
  Award,
  GraduationCap,
  Baby,
  Calendar,
  Languages,
  Shield,
} from "lucide-react";

const quickFacts = [
  { icon: Calendar, value: "2022", label: "Year Founded" },
  { icon: Users, value: "350+", label: "Students" },
  { icon: Languages, value: "International", label: "Curriculum" },
  { icon: Shield, value: "Safe & Modern", label: "Campus" },
];

const values = [
  {
    icon: BookOpen,
    title: "Academic Excellence",
    desc: "A rigorous, well-rounded curriculum that challenges every learner to achieve their full potential.",
  },
  {
    icon: Globe,
    title: "Global Perspective",
    desc: "An internationally benchmarked curriculum that prepares students for success in a global world.",
  },
  {
    icon: Heart,
    title: "Character Development",
    desc: "Building not just scholars, but responsible and compassionate members of society.",
  },
  {
    icon: Users,
    title: "Community",
    desc: "An inclusive, supportive environment where every student feels valued and empowered.",
  },
  {
    icon: Award,
    title: "Achievement",
    desc: "Celebrating every student's unique strengths and accomplishments across all areas.",
  },
  {
    icon: GraduationCap,
    title: "Holistic Growth",
    desc: "Nurturing academic, social, creative, and personal development in equal measure.",
  },
];

const programs = [
  {
    icon: Baby,
    title: "Nursery & Primary Section",
    teaser:
      "The foundation of our educational journey, where every child is valued, supported, and encouraged to reach their full potential.",
    body: "We focus on personalized learning, helping pupils build confidence, discover their strengths, and grow academically, socially, and creatively. Our classrooms are spacious, child-friendly, and equipped to provide a safe and engaging learning environment. Pupils benefit from access to the library, computer rooms, and a variety of extracurricular activities such as sports, music, drama, art, and educational trips. Learning at this level is hands-on and well-rounded, covering practical life skills, language development, mathematics, science, social studies, and creative activities. Through this balanced approach, we nurture curiosity, concentration, independence, and a strong sense of community among pupils, parents, and staff.",
  },
  {
    icon: GraduationCap,
    title: "Secondary Section",
    teaser:
      "Committed to academic excellence and all-round development, equipping students with the knowledge, discipline, and skills needed for future success.",
    body: "Our highly qualified teachers provide personalized guidance and support, helping students excel academically and grow in confidence. Beyond the classroom, students benefit from extracurricular activities including sports, clubs, and community service, which build leadership, teamwork, and social responsibility. SGIS provides a modern learning environment with well-equipped classrooms, science laboratories, computer rooms, a library, and sports facilities. We promote a strong culture of respect, inclusivity, and kindness — a safe and supportive community where every student can thrive. Our curriculum is broad-based and balanced, covering the CORE academic curriculum, CO-CURRICULAR activities, and the HIDDEN curriculum that shapes attitudes, values, and character.",
  },
];

export function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-3xl">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
              About Us
            </p>
            <h1 className="text-h1 font-serif font-bold text-foreground mb-6 leading-tight">
              Educating Minds. Building Character.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              At SGIS, we believe education is about more than acquiring knowledge — it is about
              developing the skills and character necessary to become responsible, contributing
              members of society.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* About SGIS */}
      <section className="section-padding">
        <div className="container mx-auto container-padding">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <FadeIn direction="left">
              <div className="space-y-5">
                <h2 className="text-h2 font-serif font-bold text-foreground">About SGIS</h2>
                <p className="text-muted-foreground leading-relaxed">
                  At SGIS, we believe in providing an exceptional education that not only prepares
                  our students for the future but also enriches their lives in the present. Our
                  dedicated faculty and staff work tirelessly to create a learning environment that
                  is engaging, challenging, and supportive. Our mission is to provide an environment
                  that inspires our students to achieve their full potential.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We are committed to ensuring that every student who enters our doors feels valued,
                  supported, and empowered to succeed. To us, education is not only about acquiring
                  knowledge but also about developing the skills and character traits necessary to
                  become responsible and contributing members of society.
                </p>
              </div>
            </FadeIn>

            {/* Quick facts */}
            <FadeIn direction="right" delay={0.1}>
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-primary uppercase tracking-wider">
                  Quick Facts
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {quickFacts.map((fact) => (
                    <div
                      key={fact.label}
                      className="glass-card rounded-2xl p-5 space-y-2 hover:shadow-brand-md transition-shadow"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <fact.icon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-serif font-bold text-2xl text-foreground">{fact.value}</p>
                      <p className="text-xs text-muted-foreground">{fact.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="section-padding bg-muted/20">
        <div className="container mx-auto container-padding">
          <FadeIn className="mb-12 space-y-3">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              Our Programs
            </p>
            <h2 className="text-h2 font-serif font-bold text-foreground">
              Excellence Across Every Level of Education
            </h2>
          </FadeIn>

          <div className="space-y-8">
            {programs.map((program, i) => (
              <FadeIn key={program.title} delay={i * 0.1}>
                <div className="glass-card rounded-2xl p-8 space-y-4 hover:shadow-brand-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <program.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-serif font-bold text-xl text-foreground">{program.title}</h3>
                  </div>
                  <p className="text-foreground font-medium leading-relaxed">{program.teaser}</p>
                  <p className="text-muted-foreground leading-relaxed">{program.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="section-padding">
        <div className="container mx-auto container-padding">
          <FadeIn className="text-center mb-12 space-y-3">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              What We Stand For
            </p>
            <h2 className="text-h2 font-serif font-bold text-foreground">Our Core Values</h2>
          </FadeIn>
          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v) => (
              <StaggerItem key={v.title}>
                <div className="glass-card rounded-2xl p-6 space-y-3 h-full hover:shadow-brand-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <v.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-serif font-semibold text-foreground">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <AdmissionCTA />
    </>
  );
}
