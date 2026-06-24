'use client'

import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { Button } from '@/components/ui/button'
import { formatChartCurrency } from '@/lib/chart-currency'
import { cn, formatCurrency } from '@/lib/utils'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { Category } from '@prisma/client'
import { Banknote } from 'lucide-react'
import { useState, type PointerEvent } from 'react'

type BalanceTimeline =
  AppRouterOutput['groups']['stats']['get']['balanceTimeline']
type BalanceTimelineParticipant = BalanceTimeline['participants'][number]
type BalanceTimelinePoint = BalanceTimeline['points'][number]
type BalanceTimelineEvent = BalanceTimelinePoint['events'][number]

type BalanceTimelineColor = {
  legendClassName: string
  lineClassName: string
}

type TimelineCoordinate = {
  balance: number
  baseStackedBalance: number
  baseY: number
  delta: number
  point: BalanceTimelinePoint
  stackedBalance: number
  x: number
  y: number
}

type TimelineMonthTick = {
  day: number
  index: number
  key: string
  month: number
  year: number
}

type TimelineYAxisTick = {
  key: string
  label: string
  value: number
  y: number
}

type BalanceTimelineParticipantSeries = {
  color: BalanceTimelineColor
  coordinates: TimelineCoordinate[]
  participant: BalanceTimelineParticipant
}

type TimelineParticipantCoordinate = {
  color: BalanceTimelineColor
  coordinate: TimelineCoordinate
  participant: BalanceTimelineParticipant
}

type TimelineEventMarker = {
  color: BalanceTimelineColor
  coordinate: TimelineCoordinate
  event: BalanceTimelineEvent
  guideY: number
  key: string
  railX: number
  title: string
}

type TimelineInterval = {
  centerX: number
  coordinate: TimelineCoordinate
  endX: number
  width: number
  x: number
}

type TimelineStackOrder = 'smallInside' | 'smallOutside'

const BALANCE_TIMELINE_COLORS: BalanceTimelineColor[] = [
  {
    legendClassName: 'bg-blue-500 dark:bg-blue-400',
    lineClassName: 'text-blue-600 dark:text-blue-400',
  },
  {
    legendClassName: 'bg-purple-500 dark:bg-purple-400',
    lineClassName: 'text-purple-600 dark:text-purple-400',
  },
  {
    legendClassName: 'bg-yellow-500 dark:bg-yellow-400',
    lineClassName: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    legendClassName: 'bg-slate-500 dark:bg-slate-400',
    lineClassName: 'text-slate-600 dark:text-slate-400',
  },
  {
    legendClassName: 'bg-cyan-500 dark:bg-cyan-400',
    lineClassName: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    legendClassName: 'bg-indigo-500 dark:bg-indigo-400',
    lineClassName: 'text-indigo-600 dark:text-indigo-400',
  },
]

const DAY_IN_MS = 24 * 60 * 60 * 1000
const TIMELINE_CHART_WIDTH = 1000
const TIMELINE_CHART_HEIGHT = 260
const TIMELINE_CHART_PADDING_X = 18
const TIMELINE_Y_AXIS_GUTTER_WIDTH = 62
const TIMELINE_PLOT_LEFT_X =
  TIMELINE_CHART_PADDING_X + TIMELINE_Y_AXIS_GUTTER_WIDTH
const TIMELINE_PLOT_RIGHT_X = TIMELINE_CHART_WIDTH - TIMELINE_CHART_PADDING_X
const TIMELINE_PLOT_WIDTH = TIMELINE_PLOT_RIGHT_X - TIMELINE_PLOT_LEFT_X
const TIMELINE_Y_AXIS_LABEL_X = TIMELINE_PLOT_LEFT_X - 8
const TIMELINE_CHART_CENTER_Y = 130
const TIMELINE_CHART_HALF_HEIGHT = 84
const TIMELINE_PLOT_TOP_Y = TIMELINE_CHART_CENTER_Y - TIMELINE_CHART_HALF_HEIGHT
const TIMELINE_PLOT_BOTTOM_Y =
  TIMELINE_CHART_CENTER_Y + TIMELINE_CHART_HALF_HEIGHT
const TIMELINE_AREA_LABEL_X = TIMELINE_PLOT_LEFT_X + 8
const TIMELINE_OWES_AREA_LABEL_Y = TIMELINE_PLOT_TOP_Y + 14
const TIMELINE_IS_OWED_AREA_LABEL_Y = TIMELINE_PLOT_BOTTOM_Y - 10
const TIMELINE_EVENT_MARKER_RAIL_Y = TIMELINE_PLOT_TOP_Y - 14
const TIMELINE_EVENT_MARKER_SIZE = 20
const TIMELINE_EVENT_MARKER_GAP = 24
const TIMELINE_HOVER_TOOLTIP_WIDTH = 244
const TIMELINE_INTERVAL_GAP = 1
const TIMELINE_INTERVAL_PARTICIPANT_WIDTH_RATIO = 0.62
const TIMELINE_IS_OWED_AREA_CLASS_NAME = 'fill-green-200 dark:fill-green-800'
const TIMELINE_OWES_AREA_CLASS_NAME = 'fill-red-500 dark:fill-red-400'

export function BalanceTimelineChart({
  balanceTimeline,
  currency,
  locale,
  roundAmounts,
  t,
}: {
  balanceTimeline: BalanceTimeline
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  roundAmounts: boolean
  t: (key: string) => string
}) {
  const [showCategoryMarkers, setShowCategoryMarkers] = useState(false)
  const [stackOrder, setStackOrder] =
    useState<TimelineStackOrder>('smallOutside')

  if (
    balanceTimeline.points.length === 0 ||
    balanceTimeline.participants.length === 0
  ) {
    return null
  }

  const monthTicks = getTimelineMonthTicks(
    balanceTimeline.rangeStart,
    balanceTimeline.rangeEnd,
  )

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold">{t('balanceTimelineTitle')}</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {balanceTimeline.participants.map((participant, participantIndex) => {
            const color = getBalanceTimelineColor(participantIndex)

            return (
              <span
                className="flex min-w-0 items-center gap-1.5"
                key={participant.id}
              >
                <span
                  className={cn(
                    'h-3.5 w-2.5 shrink-0 rounded-[2px]',
                    color.legendClassName,
                  )}
                />
                <span className="truncate">{participant.name}</span>
              </span>
            )
          })}
          <span className="flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-lime-400 drop-shadow-[0_0_3px_rgba(163,230,53,0.9)]" />
            {t('payment')}
          </span>
        </div>
      </div>
      <div className="space-y-1 pb-1">
        <BalanceTimelineLinesChart
          balanceTimeline={balanceTimeline}
          currency={currency}
          locale={locale}
          monthTicks={monthTicks}
          roundAmounts={roundAmounts}
          showCategoryMarkers={showCategoryMarkers}
          stackOrder={stackOrder}
          t={t}
        />
        <TimelineMonthAxis
          locale={locale}
          rangeEnd={balanceTimeline.rangeEnd}
          rangeStart={balanceTimeline.rangeStart}
          ticks={monthTicks}
        />
        <div className="flex flex-wrap justify-end gap-1.5 pt-1">
          <Button
            aria-pressed={showCategoryMarkers}
            className="h-6 px-1.5 text-[10px]"
            onClick={() => setShowCategoryMarkers((value) => !value)}
            type="button"
            variant={showCategoryMarkers ? 'secondary' : 'outline'}
          >
            {t('categoryMarkers')}
          </Button>
          <StackOrderToggle
            onStackOrderChange={setStackOrder}
            stackOrder={stackOrder}
            t={t}
          />
        </div>
      </div>
    </section>
  )
}

function StackOrderToggle({
  onStackOrderChange,
  stackOrder,
  t,
}: {
  onStackOrderChange: (stackOrder: TimelineStackOrder) => void
  stackOrder: TimelineStackOrder
  t: (key: string) => string
}) {
  const isSmallOutside = stackOrder === 'smallOutside'

  return (
    <Button
      aria-label={t('stackOrderLabel')}
      aria-pressed={isSmallOutside}
      className="h-6 px-1.5 text-[10px]"
      onClick={() =>
        onStackOrderChange(isSmallOutside ? 'smallInside' : 'smallOutside')
      }
      title={t('stackOrderLabel')}
      type="button"
      variant={isSmallOutside ? 'secondary' : 'outline'}
    >
      {t(
        isSmallOutside ? 'StackOrders.smallOutside' : 'StackOrders.smallInside',
      )}
    </Button>
  )
}

function BalanceTimelineLinesChart({
  balanceTimeline,
  currency,
  locale,
  monthTicks,
  roundAmounts,
  showCategoryMarkers,
  stackOrder,
  t,
}: {
  balanceTimeline: BalanceTimeline
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  monthTicks: TimelineMonthTick[]
  roundAmounts: boolean
  showCategoryMarkers: boolean
  stackOrder: TimelineStackOrder
  t: (key: string) => string
}) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(
    null,
  )
  const maxStackedAbsBalance = getMaxStackedAbsBalance(balanceTimeline.points)
  const yAxisMaxBalance = getBalanceTimelineYAxisMax(
    maxStackedAbsBalance,
    currency,
  )
  const yAxisTicks = getBalanceTimelineYAxisTicks({
    currency,
    locale,
    yAxisMaxBalance,
  })
  const participantIds = balanceTimeline.participants.map(
    (participant) => participant.id,
  )
  const participantSeries: BalanceTimelineParticipantSeries[] =
    balanceTimeline.participants.map((participant, participantIndex) => ({
      color: getBalanceTimelineColor(participantIndex),
      coordinates: getTimelineCoordinates({
        participantId: participant.id,
        participantIds,
        points: balanceTimeline.points,
        rangeEnd: balanceTimeline.rangeEnd,
        rangeStart: balanceTimeline.rangeStart,
        stackOrder,
        yAxisMaxBalance,
      }),
      participant,
    }))
  const timelineCoordinates = participantSeries[0]?.coordinates ?? []
  const timelineIntervals = getTimelineIntervals(timelineCoordinates)
  const hoveredParticipantCoordinates =
    hoveredPointIndex === null
      ? []
      : participantSeries.flatMap(({ color, coordinates, participant }) => {
          const coordinate = coordinates[hoveredPointIndex]

          if (!coordinate) return []

          return [{ color, coordinate, participant }]
        })

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (timelineCoordinates.length === 0) return

    const rect = event.currentTarget.getBoundingClientRect()
    const rawX =
      ((event.clientX - rect.left) / rect.width) * TIMELINE_CHART_WIDTH
    const x = clamp(rawX, TIMELINE_PLOT_LEFT_X, TIMELINE_PLOT_RIGHT_X)
    const nextPointIndex = getTimelineIntervalIndex(timelineIntervals, x)

    setHoveredPointIndex((currentPointIndex) =>
      currentPointIndex === nextPointIndex ? currentPointIndex : nextPointIndex,
    )
  }

  return (
    <div
      className="relative h-72 w-full"
      onPointerLeave={() => setHoveredPointIndex(null)}
      onPointerMove={handlePointerMove}
    >
      <svg
        aria-label={t('balanceTimelineTitle')}
        className="absolute inset-0 h-full w-full overflow-visible rounded-sm bg-white"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${TIMELINE_CHART_WIDTH} ${TIMELINE_CHART_HEIGHT}`}
      >
        <TimelineYAxisGrid ticks={yAxisTicks} />
        {monthTicks.map((tick) => {
          const x = getTimelineXCoordinate(tick, {
            rangeEnd: balanceTimeline.rangeEnd,
            rangeStart: balanceTimeline.rangeStart,
          })

          return (
            <line
              className="stroke-border"
              key={tick.key}
              opacity="0.42"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              x1={x}
              x2={x}
              y1={TIMELINE_PLOT_TOP_Y}
              y2={TIMELINE_PLOT_BOTTOM_Y}
            />
          )
        })}
        <TimelineBalanceColumns
          currency={currency}
          locale={locale}
          participantSeries={participantSeries}
          roundAmounts={roundAmounts}
          yAxisMaxBalance={yAxisMaxBalance}
        />
        <line
          className="stroke-foreground"
          opacity="0.65"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          x1={TIMELINE_PLOT_LEFT_X}
          x2={TIMELINE_PLOT_RIGHT_X}
          y1={TIMELINE_CHART_CENTER_Y}
          y2={TIMELINE_CHART_CENTER_Y}
        />
        <TimelineBalanceAreaLabels t={t} />
        <TimelineHoverGuide
          hoveredInterval={
            hoveredPointIndex === null
              ? undefined
              : timelineIntervals[hoveredPointIndex]
          }
          hoveredParticipantCoordinates={hoveredParticipantCoordinates}
        />
      </svg>
      <TimelineEventMarkerLayer
        currency={currency}
        locale={locale}
        participantSeries={participantSeries}
        roundAmounts={roundAmounts}
        showCategoryMarkers={showCategoryMarkers}
      />
      <TimelineHoverTooltip
        currency={currency}
        hoveredParticipantCoordinates={hoveredParticipantCoordinates}
        locale={locale}
        roundAmounts={roundAmounts}
        t={t}
      />
    </div>
  )
}

function TimelineYAxisGrid({ ticks }: { ticks: TimelineYAxisTick[] }) {
  return (
    <g aria-hidden="true" pointerEvents="none">
      {ticks.map((tick) => (
        <g key={tick.key}>
          {tick.value !== 0 && (
            <line
              className="stroke-border"
              opacity="0.42"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              x1={TIMELINE_PLOT_LEFT_X}
              x2={TIMELINE_PLOT_RIGHT_X}
              y1={tick.y}
              y2={tick.y}
            />
          )}
          <text
            className="fill-muted-foreground text-[11px] tabular-nums"
            dominantBaseline="middle"
            textAnchor="end"
            x={TIMELINE_Y_AXIS_LABEL_X}
            y={tick.y}
          >
            {tick.label}
          </text>
        </g>
      ))}
    </g>
  )
}

function TimelineBalanceAreaLabels({ t }: { t: (key: string) => string }) {
  const labels = [
    {
      className: 'fill-red-700 dark:fill-red-200',
      key: 'owes',
      text: t('owesMoney'),
      y: TIMELINE_OWES_AREA_LABEL_Y,
    },
    {
      className: 'fill-green-700 dark:fill-green-200',
      key: 'is-owed',
      text: t('isOwedMoney'),
      y: TIMELINE_IS_OWED_AREA_LABEL_Y,
    },
  ]

  return (
    <g pointerEvents="none">
      {labels.map((label) => {
        const labelWidth = getTimelineTextLabelWidth(label.text)

        return (
          <g key={label.key}>
            <rect
              className="fill-white"
              height="18"
              opacity="0.86"
              rx="4"
              width={labelWidth}
              x={TIMELINE_AREA_LABEL_X - 6}
              y={label.y - 12}
            />
            <text
              className={cn('text-[12px] font-semibold', label.className)}
              dominantBaseline="middle"
              textAnchor="start"
              x={TIMELINE_AREA_LABEL_X}
              y={label.y}
            >
              {label.text}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function TimelineBalanceColumns({
  currency,
  locale,
  participantSeries,
  roundAmounts,
  yAxisMaxBalance,
}: {
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  participantSeries: BalanceTimelineParticipantSeries[]
  roundAmounts: boolean
  yAxisMaxBalance: number
}) {
  const timelineCoordinates = participantSeries[0]?.coordinates ?? []
  const timelineIntervals = getTimelineIntervals(timelineCoordinates)

  return (
    <g>
      <g aria-hidden="true">
        {timelineIntervals.map((interval) => {
          const { negativeTotal, positiveTotal } = getPointBalanceTotals(
            interval.coordinate.point,
          )
          const negativeY = getTimelineStackY(negativeTotal, yAxisMaxBalance)
          const positiveY = getTimelineStackY(positiveTotal, yAxisMaxBalance)

          if (interval.width <= 0) return null

          return (
            <g key={`${interval.coordinate.point.key}-polarity-column`}>
              {negativeTotal < 0 && (
                <rect
                  className={TIMELINE_OWES_AREA_CLASS_NAME}
                  fillOpacity="0.3"
                  height={TIMELINE_CHART_CENTER_Y - negativeY}
                  width={interval.width}
                  x={interval.x}
                  y={negativeY}
                />
              )}
              {positiveTotal > 0 && (
                <rect
                  className={TIMELINE_IS_OWED_AREA_CLASS_NAME}
                  fillOpacity="0.8"
                  height={positiveY - TIMELINE_CHART_CENTER_Y}
                  width={interval.width}
                  x={interval.x}
                  y={TIMELINE_CHART_CENTER_Y}
                />
              )}
            </g>
          )
        })}
      </g>
      {participantSeries.map(({ color, coordinates, participant }) => (
        <g key={`${participant.id}-columns`}>
          {getTimelineIntervals(coordinates).map((interval) => {
            const coordinate = interval.coordinate
            const height = Math.abs(coordinate.y - coordinate.baseY)
            const participantColumnWidth =
              getTimelineParticipantColumnWidth(interval)

            if (height < 0.8 || interval.width <= 0) return null

            return (
              <rect
                className={cn('fill-current', color.lineClassName)}
                height={height}
                key={`${participant.id}-${coordinate.point.key}-column`}
                opacity="0.92"
                shapeRendering="crispEdges"
                width={participantColumnWidth}
                x={interval.centerX - participantColumnWidth / 2}
                y={Math.min(coordinate.y, coordinate.baseY)}
              >
                <title>
                  {getBalanceTimelinePointLabel({
                    balance: coordinate.balance,
                    currency,
                    locale,
                    participant,
                    roundAmounts,
                  })}
                </title>
              </rect>
            )
          })}
        </g>
      ))}
    </g>
  )
}

function TimelineHoverGuide({
  hoveredInterval,
  hoveredParticipantCoordinates,
}: {
  hoveredInterval?: TimelineInterval
  hoveredParticipantCoordinates: TimelineParticipantCoordinate[]
}) {
  const x = hoveredParticipantCoordinates[0]?.coordinate.x

  if (x === undefined) return null

  return (
    <g pointerEvents="none">
      <rect
        className="fill-foreground"
        height={TIMELINE_PLOT_BOTTOM_Y - TIMELINE_PLOT_TOP_Y}
        opacity="0.06"
        width={hoveredInterval?.width ?? 0}
        x={hoveredInterval?.x ?? x}
        y={TIMELINE_PLOT_TOP_Y}
      />
      <line
        className="stroke-foreground"
        opacity="0.7"
        strokeDasharray="4 3"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        x1={x}
        x2={x}
        y1={TIMELINE_PLOT_TOP_Y}
        y2={TIMELINE_PLOT_BOTTOM_Y}
      />
    </g>
  )
}

function TimelineHoverTooltip({
  currency,
  hoveredParticipantCoordinates,
  locale,
  roundAmounts,
  t,
}: {
  currency: Parameters<typeof formatCurrency>[0]
  hoveredParticipantCoordinates: TimelineParticipantCoordinate[]
  locale: string
  roundAmounts: boolean
  t: (key: string) => string
}) {
  const point = hoveredParticipantCoordinates[0]?.coordinate.point

  if (!point) return null

  const x = hoveredParticipantCoordinates[0].coordinate.x
  const sortedParticipantCoordinates = [...hoveredParticipantCoordinates].sort(
    (participantA, participantB) =>
      participantA.coordinate.y - participantB.coordinate.y,
  )
  const owingParticipantCoordinates = sortedParticipantCoordinates.filter(
    ({ coordinate }) => coordinate.balance < 0,
  )
  const owedParticipantCoordinates = sortedParticipantCoordinates.filter(
    ({ coordinate }) => coordinate.balance > 0,
  )
  const positiveTotal = sortedParticipantCoordinates.reduce(
    (total, { coordinate }) =>
      coordinate.balance > 0 ? total + coordinate.balance : total,
    0,
  )
  const negativeTotal = Math.abs(
    sortedParticipantCoordinates.reduce(
      (total, { coordinate }) =>
        coordinate.balance < 0 ? total + coordinate.balance : total,
      0,
    ),
  )
  const shouldPlaceLeft =
    x > TIMELINE_PLOT_RIGHT_X - TIMELINE_HOVER_TOOLTIP_WIDTH

  return (
    <div
      className="pointer-events-none absolute z-20 w-[244px] rounded-sm border bg-background/95 p-2 text-xs shadow-lg"
      style={{
        left: `${(x / TIMELINE_CHART_WIDTH) * 100}%`,
        top: `${((TIMELINE_PLOT_TOP_Y + 8) / TIMELINE_CHART_HEIGHT) * 100}%`,
        transform: shouldPlaceLeft
          ? 'translateX(calc(-100% - 0.75rem))'
          : 'translateX(0.75rem)',
      }}
    >
      <div className="mb-1.5 font-medium text-foreground">
        {formatTimelineDay(point, locale)}
      </div>
      <div className="space-y-2 border-t pt-1.5">
        <TimelineHoverBalanceSection
          amount={negativeTotal}
          currency={currency}
          locale={locale}
          participantCoordinates={owingParticipantCoordinates}
          roundAmounts={roundAmounts}
          textClassName="text-red-700 dark:text-red-200"
          title={t('owesMoney')}
        />
        <TimelineHoverBalanceSection
          amount={positiveTotal}
          currency={currency}
          locale={locale}
          participantCoordinates={owedParticipantCoordinates}
          roundAmounts={roundAmounts}
          textClassName="text-green-700 dark:text-green-200"
          title={t('isOwedMoney')}
        />
      </div>
    </div>
  )
}

function TimelineHoverBalanceSection({
  amount,
  currency,
  locale,
  participantCoordinates,
  roundAmounts,
  textClassName,
  title,
}: {
  amount: number
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  participantCoordinates: TimelineParticipantCoordinate[]
  roundAmounts: boolean
  textClassName: string
  title: string
}) {
  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex items-center justify-between gap-3 font-semibold',
          textClassName,
        )}
      >
        <span>{title}</span>
        <span>
          {formatChartCurrency({
            amount,
            currency,
            locale,
            roundAmounts,
          })}
        </span>
      </div>
      {participantCoordinates.map(({ color, coordinate, participant }) => (
        <div
          className="flex items-start gap-2"
          key={`${participant.id}-${coordinate.point.key}-tooltip`}
        >
          <span
            className={cn(
              'mt-0.5 h-3.5 w-2.5 shrink-0 rounded-[2px]',
              color.legendClassName,
            )}
          />
          <span className="min-w-0 flex-1 text-muted-foreground">
            {formatParticipantBalance({
              amount: coordinate.balance,
              currency,
              includeCurrently: false,
              locale,
              participantName: participant.name,
              roundAmounts,
            })}
          </span>
        </div>
      ))}
    </div>
  )
}

function TimelineEventMarkerLayer({
  currency,
  locale,
  participantSeries,
  roundAmounts,
  showCategoryMarkers,
}: {
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  participantSeries: BalanceTimelineParticipantSeries[]
  roundAmounts: boolean
  showCategoryMarkers: boolean
}) {
  const markers = getTimelineEventMarkers({
    currency,
    locale,
    participantSeries,
    roundAmounts,
    showCategoryMarkers,
  })

  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox={`0 0 ${TIMELINE_CHART_WIDTH} ${TIMELINE_CHART_HEIGHT}`}
      >
        {markers.map(({ coordinate, event, guideY, key, railX }) => (
          <line
            className={
              event.isReimbursement
                ? 'stroke-lime-400'
                : 'stroke-muted-foreground'
            }
            key={`${key}-guide`}
            opacity={event.isReimbursement ? '0.95' : '0.58'}
            strokeDasharray={event.isReimbursement ? undefined : '1 5'}
            strokeLinecap="round"
            strokeWidth="1.1"
            vectorEffect="non-scaling-stroke"
            x1={railX}
            x2={coordinate.x}
            y1={TIMELINE_EVENT_MARKER_RAIL_Y}
            y2={guideY}
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0">
        {markers.map(({ color, coordinate, event, key, railX, title }) => (
          <div
            aria-label={title}
            className={cn(
              'pointer-events-auto absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[3px] border bg-background/95 shadow-sm',
              event.isReimbursement ? 'border-lime-300' : 'border-border',
            )}
            key={key}
            style={{
              left: `${(railX / TIMELINE_CHART_WIDTH) * 100}%`,
              top: `${(TIMELINE_EVENT_MARKER_RAIL_Y / TIMELINE_CHART_HEIGHT) * 100}%`,
            }}
            title={title}
          >
            {event.isReimbursement ? (
              <Banknote className="h-3.5 w-3.5 text-lime-400 opacity-95 drop-shadow-[0_0_3px_rgba(163,230,53,0.9)]" />
            ) : (
              <CategoryIcon
                category={event.category as Category | null}
                className={cn('h-3.5 w-3.5 opacity-55', color.lineClassName)}
              />
            )}
            <span className="sr-only">{title}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function getTimelineEventMarkers({
  currency,
  locale,
  participantSeries,
  roundAmounts,
  showCategoryMarkers,
}: {
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  participantSeries: BalanceTimelineParticipantSeries[]
  roundAmounts: boolean
  showCategoryMarkers: boolean
}): TimelineEventMarker[] {
  const markers = participantSeries.flatMap(
    ({ color, coordinates, participant }) =>
      coordinates.flatMap((coordinate) => {
        const events = getMarkerEvents({
          coordinate,
          participantId: participant.id,
          showCategoryMarkers,
        })

        return events.map((event, eventIndex) => ({
          color,
          coordinate,
          event,
          guideY: event.isReimbursement
            ? getTimelinePointTopY(coordinate, participantSeries)
            : coordinate.y,
          key: `${participant.id}-${coordinate.point.key}-${eventIndex}-event`,
          railX: coordinate.x,
          title: event.isReimbursement
            ? getPaymentEventLabel({ currency, event, locale, roundAmounts })
            : getExpenseEventLabel({ currency, event, locale, roundAmounts }),
        }))
      }),
  )

  const markerCountByPoint = new Map<string, number>()

  return markers.map((marker) => {
    const pointKey = marker.coordinate.point.key
    const pointMarkerIndex = markerCountByPoint.get(pointKey) ?? 0
    const pointMarkerCount = markers.filter(
      (candidateMarker) => candidateMarker.coordinate.point.key === pointKey,
    ).length

    markerCountByPoint.set(pointKey, pointMarkerIndex + 1)

    return {
      ...marker,
      railX: clamp(
        marker.coordinate.x +
          (pointMarkerIndex - (pointMarkerCount - 1) / 2) *
            TIMELINE_EVENT_MARKER_GAP,
        TIMELINE_PLOT_LEFT_X + TIMELINE_EVENT_MARKER_SIZE / 2,
        TIMELINE_PLOT_RIGHT_X - TIMELINE_EVENT_MARKER_SIZE / 2,
      ),
    }
  })
}

function getTimelinePointTopY(
  coordinate: TimelineCoordinate,
  participantSeries: BalanceTimelineParticipantSeries[],
) {
  const pointCoordinates = participantSeries.flatMap(({ coordinates }) =>
    coordinates.filter(
      (candidateCoordinate) =>
        candidateCoordinate.point.key === coordinate.point.key,
    ),
  )

  return Math.min(
    TIMELINE_CHART_CENTER_Y,
    ...pointCoordinates.map((pointCoordinate) =>
      Math.min(pointCoordinate.y, pointCoordinate.baseY),
    ),
  )
}

function TimelineMonthAxis({
  locale,
  rangeEnd,
  rangeStart,
  ticks,
}: {
  locale: string
  rangeEnd: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>
  rangeStart: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>
  ticks: TimelineMonthTick[]
}) {
  return (
    <div className="relative h-3 text-[10px] leading-none text-muted-foreground">
      {ticks.map((tick) => {
        const left = getTimelineXPercent(tick, { rangeEnd, rangeStart })

        return (
          <span
            className={cn(
              'absolute top-0 max-w-12 truncate',
              left <= 1
                ? 'translate-x-0 text-left'
                : left >= 99
                  ? '-translate-x-full text-right'
                  : '-translate-x-1/2 text-center',
            )}
            key={tick.key}
            style={{ left: `${left}%` }}
            title={formatTimelineMonth(tick, locale, 'long')}
          >
            {formatTimelineMonth(tick, locale, 'short')}
          </span>
        )
      })}
    </div>
  )
}

function getTimelineCoordinates({
  participantId,
  participantIds,
  points,
  rangeEnd,
  rangeStart,
  stackOrder,
  yAxisMaxBalance,
}: {
  participantId: string
  participantIds: string[]
  points: BalanceTimelinePoint[]
  rangeEnd: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>
  rangeStart: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>
  stackOrder: TimelineStackOrder
  yAxisMaxBalance: number
}): TimelineCoordinate[] {
  return points.map((point) => {
    const balance = point.balances[participantId] ?? 0
    const delta = point.deltas[participantId] ?? 0
    const baseStackedBalance = getBaseStackedBalance({
      participantId,
      participantIds,
      point,
      stackOrder,
    })
    const stackedBalance = getStackedBalance({
      baseStackedBalance,
      balance,
    })

    return {
      balance,
      baseStackedBalance,
      baseY: getTimelineStackY(baseStackedBalance, yAxisMaxBalance),
      delta,
      point,
      stackedBalance,
      x: getTimelineXCoordinate(point, { rangeEnd, rangeStart }),
      y: getTimelineStackY(stackedBalance, yAxisMaxBalance),
    }
  })
}

function getBaseStackedBalance({
  participantId,
  participantIds,
  point,
  stackOrder,
}: {
  participantId: string
  participantIds: string[]
  point: BalanceTimelinePoint
  stackOrder: TimelineStackOrder
}) {
  const participantBalance = point.balances[participantId] ?? 0
  if (participantBalance === 0) return 0

  const stackedParticipantIds = getSortedStackParticipantIds({
    participantBalance,
    participantIds,
    point,
    stackOrder,
  })
  const participantIndex = stackedParticipantIds.indexOf(participantId)

  return stackedParticipantIds
    .slice(0, participantIndex)
    .reduce(
      (total, stackedParticipantId) =>
        total + (point.balances[stackedParticipantId] ?? 0),
      0,
    )
}

function getSortedStackParticipantIds({
  participantBalance,
  participantIds,
  point,
  stackOrder,
}: {
  participantBalance: number
  participantIds: string[]
  point: BalanceTimelinePoint
  stackOrder: TimelineStackOrder
}) {
  const participantSign = Math.sign(participantBalance)

  return participantIds
    .filter((stackedParticipantId) => {
      const balance = point.balances[stackedParticipantId] ?? 0
      return Math.sign(balance) === participantSign
    })
    .sort((participantIdA, participantIdB) => {
      const balanceA = Math.abs(point.balances[participantIdA] ?? 0)
      const balanceB = Math.abs(point.balances[participantIdB] ?? 0)
      const amountDifference = balanceA - balanceB

      if (amountDifference !== 0) {
        return stackOrder === 'smallInside'
          ? amountDifference
          : -amountDifference
      }

      return (
        participantIds.indexOf(participantIdA) -
        participantIds.indexOf(participantIdB)
      )
    })
}

function getStackedBalance({
  balance,
  baseStackedBalance,
}: {
  balance: number
  baseStackedBalance: number
}) {
  if (balance === 0) return 0
  return baseStackedBalance + balance
}

function getMaxStackedAbsBalance(points: BalanceTimelinePoint[]) {
  return points.reduce((maxStackedAbsBalance, point) => {
    const { negativeTotal, positiveTotal } = getPointBalanceTotals(point)

    return Math.max(
      maxStackedAbsBalance,
      positiveTotal,
      Math.abs(negativeTotal),
    )
  }, 0)
}

function getBalanceTimelineYAxisMax(
  maxStackedAbsBalance: number,
  currency: Parameters<typeof formatCurrency>[0],
) {
  const maxMajorValue = maxStackedAbsBalance / 10 ** currency.decimal_digits
  const tickMajorValue = getNiceTimelineAxisNumber(maxMajorValue / 2)

  return Math.max(
    1,
    Math.round(tickMajorValue * 2 * 10 ** currency.decimal_digits),
  )
}

function getBalanceTimelineYAxisTicks({
  currency,
  locale,
  yAxisMaxBalance,
}: {
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  yAxisMaxBalance: number
}): TimelineYAxisTick[] {
  const tickStep = yAxisMaxBalance / 2

  return [-yAxisMaxBalance, -tickStep, 0, tickStep, yAxisMaxBalance].map(
    (value) => ({
      key: String(value),
      label: formatChartCurrency({
        amount: value,
        currency,
        locale,
        roundAmounts: true,
      }),
      value,
      y: getTimelineStackY(value, yAxisMaxBalance),
    }),
  )
}

function getNiceTimelineAxisNumber(value: number) {
  if (value <= 0) return 1

  const exponent = Math.floor(Math.log10(value))
  const magnitude = 10 ** exponent
  const normalizedValue = value / magnitude

  if (normalizedValue <= 1) return magnitude
  if (normalizedValue <= 2) return 2 * magnitude
  if (normalizedValue <= 5) return 5 * magnitude

  return 10 * magnitude
}

function getPointBalanceTotals(point: BalanceTimelinePoint) {
  return Object.values(point.balances).reduce(
    (totals, balance) => {
      if (balance > 0) totals.positiveTotal += balance
      if (balance < 0) totals.negativeTotal += balance

      return totals
    },
    { negativeTotal: 0, positiveTotal: 0 },
  )
}

function getTimelineStackY(
  stackedBalance: number,
  maxStackedAbsBalance: number,
) {
  return (
    TIMELINE_CHART_CENTER_Y +
    (stackedBalance / Math.max(maxStackedAbsBalance, 1)) *
      TIMELINE_CHART_HALF_HEIGHT
  )
}

function getTimelineMonthTicks(
  rangeStart: Pick<BalanceTimelinePoint, 'year' | 'month'>,
  rangeEnd: Pick<BalanceTimelinePoint, 'year' | 'month'>,
) {
  const ticks: TimelineMonthTick[] = []
  let current = { month: rangeStart.month, year: rangeStart.year }

  while (getMonthKey(current) <= getMonthKey(rangeEnd)) {
    ticks.push({
      day: 1,
      index: ticks.length,
      key: getMonthKey(current),
      month: current.month,
      year: current.year,
    })
    current = addMonths(current.year, current.month, 1)
  }

  return ticks
}

function getTimelineXCoordinate(
  point: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>,
  {
    rangeEnd,
    rangeStart,
  }: {
    rangeEnd: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>
    rangeStart: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>
  },
) {
  const durationDays = getDayNumber(rangeEnd) - getDayNumber(rangeStart)
  if (durationDays <= 0) {
    return TIMELINE_PLOT_LEFT_X + TIMELINE_PLOT_WIDTH / 2
  }

  return (
    TIMELINE_PLOT_LEFT_X +
    ((getDayNumber(point) - getDayNumber(rangeStart)) / durationDays) *
      TIMELINE_PLOT_WIDTH
  )
}

function getTimelineXPercent(
  point: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>,
  {
    rangeEnd,
    rangeStart,
  }: {
    rangeEnd: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>
    rangeStart: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>
  },
) {
  const durationDays = getDayNumber(rangeEnd) - getDayNumber(rangeStart)
  const plotStartPercent = (TIMELINE_PLOT_LEFT_X / TIMELINE_CHART_WIDTH) * 100
  const plotWidthPercent = (TIMELINE_PLOT_WIDTH / TIMELINE_CHART_WIDTH) * 100

  if (durationDays <= 0) return plotStartPercent + plotWidthPercent / 2

  return (
    plotStartPercent +
    ((getDayNumber(point) - getDayNumber(rangeStart)) / durationDays) *
      plotWidthPercent
  )
}

function getTimelineIntervals(
  coordinates: TimelineCoordinate[],
): TimelineInterval[] {
  return coordinates.map((coordinate, coordinateIndex) => {
    const startX = clamp(
      coordinate.x,
      TIMELINE_PLOT_LEFT_X,
      TIMELINE_PLOT_RIGHT_X,
    )
    const endX = clamp(
      coordinates[coordinateIndex + 1]?.x ?? TIMELINE_PLOT_RIGHT_X,
      TIMELINE_PLOT_LEFT_X,
      TIMELINE_PLOT_RIGHT_X,
    )
    const rawWidth = Math.max(0, endX - startX)
    const gap = rawWidth > TIMELINE_INTERVAL_GAP ? TIMELINE_INTERVAL_GAP : 0
    const width = Math.max(0, rawWidth - gap)
    const x = startX + gap / 2

    return {
      centerX: x + width / 2,
      coordinate,
      endX,
      width,
      x,
    }
  })
}

function getTimelineIntervalIndex(intervals: TimelineInterval[], x: number) {
  if (intervals.length === 0) return 0

  const intervalIndex = intervals.findIndex(
    (interval) => x >= interval.x && x <= interval.endX,
  )

  if (intervalIndex !== -1) return intervalIndex

  return intervals.reduce((nearestIndex, interval, candidateIndex) => {
    const nearestInterval = intervals[nearestIndex]

    return Math.abs(interval.coordinate.x - x) <
      Math.abs(nearestInterval.coordinate.x - x)
      ? candidateIndex
      : nearestIndex
  }, 0)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getBalanceTimelineColor(index: number) {
  return BALANCE_TIMELINE_COLORS[index % BALANCE_TIMELINE_COLORS.length]
}

function getTimelineTextLabelWidth(text: string) {
  return Math.max(76, text.length * 6.8 + 12)
}

function getTimelineParticipantColumnWidth(interval: TimelineInterval) {
  return Math.min(
    interval.width,
    Math.max(1.5, interval.width * TIMELINE_INTERVAL_PARTICIPANT_WIDTH_RATIO),
  )
}

function getMarkerEvents({
  coordinate,
  participantId,
  showCategoryMarkers,
}: {
  coordinate: TimelineCoordinate
  participantId: string
  showCategoryMarkers: boolean
}) {
  const paymentEvents = coordinate.point.events.filter(
    (event) => event.isReimbursement && event.paidBy.id === participantId,
  )

  if (!showCategoryMarkers || coordinate.point.isStart) return paymentEvents

  return [
    ...paymentEvents,
    ...coordinate.point.events.filter(
      (event) => !event.isReimbursement && event.paidBy.id === participantId,
    ),
  ]
}

function formatParticipantBalance({
  amount,
  currency,
  includeCurrently,
  locale,
  participantName,
  roundAmounts,
}: {
  amount: number
  currency: Parameters<typeof formatCurrency>[0]
  includeCurrently: boolean
  locale: string
  participantName: string
  roundAmounts: boolean
}) {
  const formattedAmount = formatChartCurrency({
    amount: Math.abs(amount),
    currency,
    locale,
    roundAmounts,
  })
  const currently = includeCurrently ? ' currently' : ''

  if (amount < 0)
    return `${participantName} owes ${formattedAmount}${currently}`
  if (amount > 0) {
    return `${participantName} is owed ${formattedAmount}${currently}`
  }

  return `${participantName} is settled${currently}`
}

function getPaymentEventLabel({
  currency,
  event,
  locale,
  roundAmounts,
}: {
  currency: Parameters<typeof formatCurrency>[0]
  event: BalanceTimelineEvent
  locale: string
  roundAmounts: boolean
}) {
  const paidForNames = event.paidFor
    .map((participant) => participant.name)
    .join(', ')

  return `${event.paidBy.name} paid ${formatChartCurrency({
    amount: Math.abs(event.amount),
    currency,
    locale,
    roundAmounts,
  })} to ${paidForNames}`
}

function getExpenseEventLabel({
  currency,
  event,
  locale,
  roundAmounts,
}: {
  currency: Parameters<typeof formatCurrency>[0]
  event: BalanceTimelineEvent
  locale: string
  roundAmounts: boolean
}) {
  const categoryLabel = event.category
    ? `${event.category.grouping}: ${event.category.name}`
    : 'Expense'
  const eventLabel = event.title
    ? `${event.title} (${categoryLabel})`
    : categoryLabel

  return `${eventLabel}: ${event.paidBy.name} paid ${formatChartCurrency({
    amount: Math.abs(event.amount),
    currency,
    locale,
    roundAmounts,
  })}`
}

function getBalanceTimelinePointLabel({
  balance,
  currency,
  locale,
  participant,
  roundAmounts,
}: {
  balance: number
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  participant: BalanceTimelineParticipant
  roundAmounts: boolean
}) {
  return formatParticipantBalance({
    amount: balance,
    currency,
    includeCurrently: false,
    locale,
    participantName: participant.name,
    roundAmounts,
  })
}

function formatTimelineMonth(
  tick: Pick<TimelineMonthTick, 'year' | 'month'>,
  locale: string,
  length: 'short' | 'long',
) {
  return new Intl.DateTimeFormat(locale, {
    month: length,
    timeZone: 'UTC',
    year: length === 'long' ? 'numeric' : undefined,
  }).format(new Date(Date.UTC(tick.year, tick.month, 1)))
}

function formatTimelineDay(
  point: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>,
  locale: string,
) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(point.year, point.month, point.day)))
}

function getDayNumber(
  point: Pick<BalanceTimelinePoint, 'year' | 'month' | 'day'>,
) {
  return Date.UTC(point.year, point.month, point.day) / DAY_IN_MS
}

function getMonthKey(point: Pick<BalanceTimelinePoint, 'year' | 'month'>) {
  return `${point.year}-${String(point.month + 1).padStart(2, '0')}`
}

function addMonths(year: number, month: number, monthsToAdd: number) {
  const date = new Date(Date.UTC(year, month + monthsToAdd, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
}
