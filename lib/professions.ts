// Each profession maps 1:1 to a canonical line-item catalog category, stored in
// primaryService and later used to preset the default deliverable type.
// Shared by onboarding and the profile page so both stay in sync.
export const PROFESSION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Graphic Design", label: "Graphic & brand design" },
  { value: "Logo Design", label: "Logo & visual identity" },
  { value: "UI/UX Design", label: "UI/UX & product design" },
  { value: "Illustration", label: "Illustration" },
  { value: "Software Development", label: "Software development" },
  { value: "Photography", label: "Photography" },
  { value: "Videography", label: "Videography" },
  { value: "Video Editing", label: "Video editing" },
  { value: "Motion Graphics", label: "Motion graphics & animation" },
  { value: "Social Media Content", label: "Social media content" },
  { value: "Architecture & Interior Design", label: "Architecture & interior" },
  { value: "Consulting", label: "Consulting & strategy" },
  { value: "Other", label: "Something else" },
];
