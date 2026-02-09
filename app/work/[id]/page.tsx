import { notFound } from "next/navigation";
import { workRegistry, getWorkById, getAdjacentWorks } from "@/registry/workRegistry";
import { WorkDetail } from "@/components/WorkDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return workRegistry.map((work) => ({ id: work.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const work = getWorkById(id);
  if (!work) return { title: "未找到" };
  return {
    title: `${work.title} - DataViz Studio`,
    description: work.description,
  };
}

export default async function WorkPage({ params }: PageProps) {
  const { id } = await params;
  const work = getWorkById(id);
  if (!work) notFound();

  const { prev, next } = getAdjacentWorks(id);

  return <WorkDetail work={work} prev={prev} next={next} />;
}
