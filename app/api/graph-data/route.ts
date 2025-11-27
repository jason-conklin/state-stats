import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { states as stateList } from "@/lib/states";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const metricId = searchParams.get("metric");

  if (!metricId) {
    return NextResponse.json({ error: "metric is required" }, { status: 400 });
  }

  const metric = await prisma.metric.findUnique({
    where: { id: metricId },
    include: { source: true },
  });

  if (!metric) {
    return NextResponse.json({ error: "metric not found" }, { status: 404 });
  }

  const observations = await prisma.observation.findMany({
    where: { metricId },
    select: { stateId: true, year: true, value: true },
    orderBy: [{ year: "asc" }],
  });

  const years = Array.from(new Set(observations.map((o) => o.year))).sort((a, b) => a - b);

  const seriesMap = new Map<
    string,
    {
      stateId: string;
      stateName: string;
      points: { year: number; value: number | null }[];
    }
  >();

  observations.forEach((obs) => {
    if (!seriesMap.has(obs.stateId)) {
      const match = stateList.find((state) => state.id === obs.stateId);
      seriesMap.set(obs.stateId, {
        stateId: obs.stateId,
        stateName: match?.name ?? obs.stateId,
        points: [],
      });
    }
    const entry = seriesMap.get(obs.stateId);
    if (entry) {
      entry.points.push({ year: obs.year, value: obs.value });
    }
  });

  const response = {
    metric: {
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      description: metric.description,
      sourceName: metric.source?.name ?? null,
    },
    availableYears: years,
    series: Array.from(seriesMap.values()),
  };

  return NextResponse.json(response);
}
