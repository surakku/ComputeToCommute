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




const data = [
  { name: 'A', uv: 400, pv: 240 },
  { name: 'B', uv: 300, pv: 456 },
  { name: 'C', uv: 300, pv: 139 },
  { name: 'D', uv: 200, pv: 980 },
  { name: 'E', uv: 278, pv: 390 },
  { name: 'F', uv: 189, pv: 480 }
]

export default function HeatChart() {
  return (
    <ResponsiveContainer width="90%" height="90%">
  <LineChart data={data}>
    <CartesianGrid stroke="#ffffff20" strokeDasharray="4 4" />

    <XAxis dataKey="name" stroke="#ffffff80">
      <Label value="Time" position="insideBottom" fill="#ffffff" dy={5}/>
    </XAxis>

    <YAxis stroke="#ffffff80">
      <Label value="Heat energy transferred" angle={-90} position="inside" dx={-25} fill="#ffffff" />
    </YAxis>

    <Tooltip
      contentStyle={{ backgroundColor: '#123e66', border: 'none' }}
      labelStyle={{ color: '#ffffff' }}
    />

    <Legend />




    <Line
      type="monotone"
      dataKey="uv"
      stroke="#4ade80"
      strokeWidth={2}
    //   name="Heat Energy transferred"
      dy={10}
    />

    <Line
      type="monotone"
      dataKey="pv"
      stroke="#f87171"
      strokeWidth={2}
    //   name="Reused"
      dy={10}
    />
  </LineChart>
</ResponsiveContainer>
  )
}