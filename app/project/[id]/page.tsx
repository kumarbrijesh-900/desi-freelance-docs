import { redirect } from "next/navigation";

export default function ProjectRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard?project=${params.id}`);
}
