import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Label,
  Legend
} from 'recharts'
import { useEffect, useState } from 'react'

type HeatData = {
  name: string
  uv?: number
  pv?: number
}

interface HeatChartProps {
  onPrediction?: (value: number) => void
}

export default function HeatChart({ onPrediction }: HeatChartProps) {
  const [data, setData] = useState<HeatData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('http://localhost:5000/api/predict')
        if (!res.ok) throw new Error()
        const result = await res.json()

        const lastIndex = result.x_past.length - 1
        const lastActual = result.rolling_actuals[lastIndex]

        const chartData: HeatData[] = result.x_past.map((x: number, i: number) => {
          const point: HeatData = {
            name: `${x * 6}h`,
            uv: result.rolling_actuals[i],
          }
          if (i === lastIndex) {
            point.pv = lastActual
          }
          return point
        })

        const predictionValue =
          result.future_values?.[1] ??
          result.prediction_kwh ??
          null

        if (predictionValue !== null && predictionValue !== undefined) {
          chartData.push({
            name: "+6h",
            pv: predictionValue,
          })
          onPrediction?.(predictionValue)
        }

        setData(chartData)
      } catch (err) {
        setError("Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>

  return (
    <div style={{ width: '90%', height: '90%' }}>
      <ResponsiveContainer width="90%" height="85%">
        <LineChart data={data}>
          <CartesianGrid stroke="#ffffff20" strokeDasharray="4 4" />

          <XAxis dataKey="name" stroke="#ffffff80">
            <Label value="Time" position="insideBottom" fill="#ffffff" dy={7}/>
          </XAxis>

          <YAxis stroke="#ffffff80">
            <Label
              value="Heat energy transferred"
              angle={-90}
              position="inside"
              dx={-25}
              fill="#ffffff"
            />
          </YAxis>

          <Tooltip
            contentStyle={{ backgroundColor: '#123e66', border: 'none' }}
            labelStyle={{ color: '#ffffff' }}
          />

          <Legend />

          <Line
            name="Actual"
            type="monotone"
            dataKey="uv"
            stroke="#4ade80"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          <Line
            name="Prediction"
            type="monotone"
            dataKey="pv"
            stroke="#f87171"
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={{ r: 4, fill: '#f87171' }}
            connectNulls
            isAnimationActive={false}
          />

        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}