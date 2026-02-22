import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'



type PipeSegment = {
  id: number
  coordinates: [number, number][]
  wasteScore: number
}

function App() {
  
  // 1. Map Center (Champaign/Urbana area)
  const center: [number, number] = [40.1106, -88.2073]

    // 2. Mock ML Output (replace later with backend/API data)
  const pipeData: PipeSegment[] = [
    {
      id: 1,
      coordinates: [
        [40.1106, -88.2073],
        [40.1150, -88.2000]
      ],
      wasteScore: 0.92
    },
    {
      id: 2,
      coordinates: [
        [40.1080, -88.2150],
        [40.1120, -88.2200]
      ],
      wasteScore: 0.35
    }
  ]

return (
  <div className="page-container">
    <h1 className="page-title">Compute To Commute</h1>
<p>...</p>
    <section className="top-container">
      </section>

      

    <div className="map-wrapper">
      <MapContainer
        center={center}
        zoom={14}
        className="map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pipeData.map((pipe) => {
          const color = pipe.wasteScore > 0.8 ? 'red' : 'green'

          return (
            <Polyline
              key={pipe.id}
              positions={pipe.coordinates}
              color={color}
              weight={6}
            >
              <Popup>
                <strong>Pipe ID:</strong> {pipe.id} <br />
                <strong>Waste Score:</strong> {pipe.wasteScore}
              </Popup>
            </Polyline>
          )
        })}


      </MapContainer>
    </div>
    
        <section className="bottom-container">
          <div className="bottom-con"></div>
          <div className="bottom-con"></div>
          <div className="bottom-con"></div>
          <div className="bottom-con"></div>  
        </section>


    
  </div>
)
}

export default App