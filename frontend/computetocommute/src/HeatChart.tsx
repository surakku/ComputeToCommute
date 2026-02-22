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

export default function HeatChart() {
  const [data, setData] = useState<HeatData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/predict")
        if (!res.ok) throw new Error()
        const result = await res.json()

        // Transform API response into chart data
        const chartData: HeatData[] = result.x_past.map((x: number, i: number) => ({
          name: `${x * 6}h`,
          uv: result.rolling_actuals[i],
        }))

        // Set pv on the last actual point so the dotted line connects
        const lastActual = result.rolling_actuals[result.rolling_actuals.length - 1]
        chartData[chartData.length - 1].pv = lastActual

        // Add the prediction point (only pv, no uv)
        chartData.push({
          name: "+6h",
          pv: result.future_values[1],
        })

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
    <ResponsiveContainer width="90%" height="90%">
      <LineChart data={data}>
        <CartesianGrid stroke="#ffffff20" strokeDasharray="4 4" />

        <XAxis dataKey="name" stroke="#ffffff80">
          <Label value="Time" position="insideBottom" fill="#ffffff" dy={5}/>
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
          connectNulls={false}
        />

        <Line
          name="Prediction"
          type="monotone"
          dataKey="pv"
          stroke="#f87171"
          strokeWidth={2}
          strokeDasharray="8 4"
          dot={{ r: 4, fill: '#f87171' }}
          connectNulls={false}
        />

      </LineChart>
    </ResponsiveContainer>
  )
}