type Props = {
  done: number;
  total: number;
};

export function ProgressSparkbar({ done, total }: Props) {
  // Calculate how many cells (out of 8) should be filled
  // done/total as a fraction, scaled to 8 cells, rounded
  const fillCount = Math.round((done / total) * 8);
  const emptyCount = 8 - fillCount;

  const sparkbar = '█'.repeat(fillCount) + '░'.repeat(emptyCount);

  return (
    <span
      data-testid="sparkbar"
      className="font-mono whitespace-nowrap"
    >
      {done}/{total} {sparkbar}
    </span>
  );
}
