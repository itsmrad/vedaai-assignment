import { AssignmentDetailPage } from "@/components/assignments/assignment-detail-page";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Assignment — VedaAI",
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <AssignmentDetailPage id={id} />;
}
