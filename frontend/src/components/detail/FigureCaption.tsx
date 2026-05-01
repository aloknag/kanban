interface FigureCaptionProps {
  figureNumber: number
}

export function FigureCaption({ figureNumber }: FigureCaptionProps) {
  return (
    <div
      data-figure-caption
      className="text-right text-label font-mono text-ink uppercase mt-snug"
    >
      FIG. {figureNumber}
    </div>
  )
}
