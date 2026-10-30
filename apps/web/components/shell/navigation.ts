import {
  Analytics01Icon,
  BubbleChatIcon,
  Calendar03Icon,
  ChartHistogramIcon,
  Dna01Icon,
  File02Icon,
  HeartCheckIcon,
  Image01Icon,
  MedicalMaskIcon,
  Medicine01Icon,
  NoteEditIcon,
  Search01Icon,
  ShieldAlertIcon,
  Task01Icon,
  TickDouble02Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
export const navigation = [
  { label: "Workspace", items: [{ title: "Chat", href: "/", icon: BubbleChatIcon }] },
  {
    label: "Patient",
    items: [
      { title: "Overview", href: "/patient", icon: UserIcon },
      { title: "Medications", href: "/patient/medications", icon: Medicine01Icon },
      { title: "Diagnoses & history", href: "/patient/diagnoses", icon: HeartCheckIcon },
      { title: "Labs & vitals", href: "/patient/labs", icon: Analytics01Icon },
      { title: "Imaging & findings", href: "/patient/imaging", icon: Image01Icon },
      { title: "Oncology", href: "/patient/oncology", icon: Dna01Icon },
      { title: "Procedures", href: "/patient/procedures", icon: MedicalMaskIcon },
      { title: "Allergies", href: "/patient/allergies", icon: ShieldAlertIcon },
      { title: "Timeline", href: "/patient/timeline", icon: Calendar03Icon },
      { title: "Documents", href: "/patient/documents", icon: File02Icon },
    ],
  },
  {
    label: "Workflow",
    items: [
      { title: "Situations", href: "/situations", icon: Search01Icon },
      { title: "Open questions", href: "/open-questions", icon: Task01Icon },
      { title: "GP letter", href: "/letter", icon: NoteEditIcon },
      { title: "Reviews", href: "/reviews", icon: TickDouble02Icon },
    ],
  },
  {
    label: "Research",
    items: [
      { title: "Synthetic cohort", href: "/research/cohort", icon: UserGroupIcon },
      { title: "Evaluation", href: "/research/evaluation", icon: ChartHistogramIcon },
    ],
  },
];
export function routeTitle(pathname: string) {
  return (
    navigation.flatMap((group) => group.items).find((item) => item.href === pathname)?.title ??
    "Chat"
  );
}
