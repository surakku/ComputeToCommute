import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, Popup, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import polyline from '@mapbox/polyline'

import HeatChart from './HeatChart'


type PipeSegment = {
  id: number
  encodedPolyline: string
  wasteScore: number
}

// Average US household uses ~29 kWh/day for heating
// Over 6 hours that's ~7.25 kWh per household
const KWH_PER_HOUSEHOLD_6H = 7.25

// Meta-scale datacenter multiplier
// A Meta/hyperscale datacenter uses ~100-150 MW vs NPCF's ~1-2 MW
const SUPER_DATACENTER_MULTIPLIER = 75

// Average US residential electricity rate ~$0.16/kWh (EIA 2024)
const COST_PER_KWH = 0.16

function App() {
  const [prediction, setPrediction] = useState<number | null>(null)

  // 1. Map Center (Champaign/Urbana area)
  const center: [number, number] = [40.09529114648274, -88.24203016078489]

  // 2. Mock ML Output — now using encoded polylines
  const pipeData: PipeSegment[] = [
    {
      id: 1,
      encodedPolyline: 'utxsFjvnyO?Pz@t@T?T?D?T@z@@fA?R?DATRp@p@bAdA`@?`@?V?H?`@?`@?L??[|@lBN?x@@v@?n@z@?tA?RPAd@v@FJTb@PVF@H??P@J@n@r@D@V@n@?HP??rB@hCN?@tCEF?l@?|A@p@D@D??F?F?V?DBtD?J?dA?P?j@ET?VD\\@d@AtANV\\p@Mp@AHCHCB@xA?^?L?bB?F?B@@?B@DBT@H?F@F?F?LAHA??X@??D@dG?tC@lCTApC?dDAnBA|A?jBAb@?v@?b@?fAAd@?`@?H?BTX?D@?WF?h@?~@?b@?hA?zBAb@?pAApA?d@?`@?TA',
      wasteScore: 0.92
    },
    {
      id: 1,
      encodedPolyline: 'eexsFjanyO?zA?x@hBAJ?HAF?hAAL?R?R?xA?RAb@?v@?J?@D`@t@?fA?bA?D?x@@x@LRX^NPFJX\\PTl@t@?FA@?@A?A?Xd@FH@@@?@?@@B?rAApB??QfA?fA?T?A`AjCC?`A?z@@vD?f@@l@?J?b@@|A?|A?D@f@?J?b@@h@?F@F?P?tB@L?H@J@DBJBFBHDFDDBDBBLFLB@?B@BBDDJJNl@JDHDJBF@B?B?FAJC\\ODAV?|@CD?B?@@@@@@?@?@@@?@?@?@?D?R@P@zBD?@?R?ELT?D??^@fE?l@@lC?T@rCJBrBVF@B@@?@?@?@@@?B@@@B@@@DDDBBDDHBFj@KRRRLZLF?D@H@J@H?HAJA@AXvA@DBV@N?@@\\@\\@j@?d@`@?J?B?C`@?N?^?P?R?N?h@?j@?j@?j@?j@?l@?j@?h@?j@?j@?n@?PpA?d@?`@?TA',
      wasteScore: 0.92
    },
    {
      id: 1,
      encodedPolyline: '}vqsFjtsyOA?a@?S@CACACEAC?E?s@@EAqC?K?OW?O@aDA@E@{@F_A@[D_A@_@Dy@@]Bu@WCYCcAGsAMoD[QAwHq@c@EyAMSA_AIiBOQCoJy@SEaDWMAiAKu@GQC]C_AKK??HW?E??IKAq@EeAG[AiAI[CQA]MIAsBQ_BOoAMc@EcBOSAcDYOCa@CmAKQASCUCC?QCs@GQC_@DOCcAISAYE]Ms@GiAKQAsAKy@ImAKq@G[CBm@[Cc@Ec@EUCg@E]CWI_@EuAO?u@?K?i@?mB?uBA]?{@?K?yA?eE{@?',
      wasteScore: 0.99
    },
    {
      id: 1,
      encodedPolyline: 'eexsFjanyO?zA?x@hBAJ?HAF?hAAL?R?R?xA?RAb@?v@?J?@D`@t@?fA?bA?D?x@@x@LRX^NPFJX\\PTl@t@?FA@?@A?A?Xd@FH@@@?@?@@B?rAApB??QfA?fA?T?A`AjCC?`A?z@@vD?f@@l@?J?b@@|A?|A?D@f@?J?b@@h@?F@F?P?tB@L?H@J@DBJBFBHDFDDBDBBLFLB@?B@BBDDJJNl@JDHDJBF@B?B?FAJC\\ODAV?|@CD?B?@@@@@@?@?@@@?@?@?@?D?R@P@zBD?@?R?ELT?D??^@fE?l@@lC?T@rCJBrBVF@B@@?@?@?@@@?B@@@B@@@DDDBBDDHBFj@KRRRLZLF?D@H@J@H?HAJA@AXvA@DBV@N?@@\\@\\@j@?d@`@?J?B?C`@?N?^?P?R?N?h@?j@?j@?j@?j@?l@?j@?h@?j@?j@?n@?PpA?d@?`@?TA',
      wasteScore: 0.99
    },
    {
      id: 1,
      encodedPolyline: 'szysF`xjyOR?@~Db@AAr@`@A`@?VAJ?b@?HAl@?t@Ax@AV?@\\H?P?B?B`CBlB?XB?@\\fA?N?b@AVAvACtAC@r@A`@?J@FAn@?tB@bA?\\@|D@hCBjCBpG?lB?p@BlC@jC?@?zA@bB?dB?b@?T@v@V?jA|@?Pf@?|@A?h@N?FAdA?P?D?|@tAAH?@@??@BB?@D?@?HNV^AB?@?@A@?@?@?@?@?@?@?@?@@@?@?@@@?@@@?@@??@@??@@??@@?@@@?@?@@D?D?b@??^^vAt@?@?@??@?@?RF?`@A?D?@@@xAx@?L@bD?x@?rA@~C?`A?fB?h@?R?`Br@A@^A^?H@DBFDH@@?B@FBL@H@TBT@LDLDP?BFJHLHHP?^?b@?D?L?F?fA?L??\\@l@?b@|@lBN?x@@v@?n@z@?tA?RPAd@v@FJTb@PVF@H??P@J@n@r@D@V@n@?HP??rB@hCN?@tCEF?l@?|A@p@D@D??F?F?V?DBtD?J?dA?P?j@ET?VD\\@d@AtANV\\p@Mp@AHCHCB@xA?^?L?bB?F?B@@?B@DBT@H?F@F?F?LAHA??X@??D@dG?tC@lCTApC?dDAnBA|A?jBAb@?v@?b@?fAAd@?`@?H?BTX?D@?WF?h@?~@?b@?hA?zBAb@?pAApA?d@?`@?TA',
      wasteScore: 0.99
    },
    {
      id: 1,
      encodedPolyline: 'am_tFblryOF@H?^KPMNg@Pi@J]f@Vh@D^CLGDEFIBCHKDAFCHALDf@Zj@\\v@f@HU^kAHUFOf@^VP\\XHSZm@JQHKRKJKb@_@\\WHETGDCFANERMf@Ej@A^At@AV?bB?^?RAXAdC?Z?BEN@CHZ@RC`A?fAAd@AF?ZA`@A@?D?`@AbCGV?`E@^?z@@^?N?PDx@?`@?P?JAJ?VDXIB@D@vA?P?vBAN?bA?hDAN?rAATChAAR@R??KL@P?F??F~@?`A?R@`AARBbBAbBAP@`AAV?pA?J?P?Z?FAX?T?V?Z?J?L?n@?d@?XAl@@T?pA?L?xAAR@dBAV?v@?H?\\@?GB?RA?Rb@@zAAT?zC?L?L[BG@@LJDBCFABzAC\\ANFF?XI`B?FAbAB?GB?P?B??FdAAT?pAAXDdA@N?F?D?n@?XKt@?P@f@AT?L?`@Ap@?H?TAnA??C\\A?D^?\\?V?T?p@AX?L?D?\\?Z?lBAT?x@??IVA?J|@AX?~@?~@AX?h@?\\AlA@|@?b@?bCCh@ATAl@?X?LATA|@@Z?x@BD?~@@V@R@v@BL@bAHB?nALB@\\DXB~@NL@XD@@j@FAG?a@?O?S?O?iA?e@?UAgA?uCpC?dDAnBA|A?jBAb@?v@?b@?fAAd@?`@?H?BTX?D@?WF?h@?~@?b@?hA?zBAb@?pAApA?d@?`@?TA',
      wasteScore: 0.99
    }
  ]

  const householdsPowered = prediction !== null
    ? Math.floor(prediction / KWH_PER_HOUSEHOLD_6H)
    : null

  const superHouseholdsPowered = prediction !== null
    ? Math.floor((prediction * SUPER_DATACENTER_MULTIPLIER) / KWH_PER_HOUSEHOLD_6H)
    : null

  const savingsNPCF = prediction !== null
    ? prediction * COST_PER_KWH
    : null

  const savingsMeta = prediction !== null
    ? prediction * SUPER_DATACENTER_MULTIPLIER * COST_PER_KWH
    : null

return (
  <div className="page-container">
    <h1 className="page-title">Compute To Commute</h1>
    <section className="top-container">
      <h2>NPCF Datacenter Heat Reuse Dashboard</h2>
      <p id="mes">This dashboard visualizes the waste heat reuse potential of datacenters in the Champaign/Urbana area. The map shows datacenter locations and nearby pipe segments.</p>
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

        <CircleMarker
          center={center}
          radius={8}
          pathOptions={{ color: '#0015ff', fillColor: '#1238f7', fillOpacity: 0.9 }}
        >
          <Popup>Data Center Location</Popup>
        </CircleMarker>

        {pipeData.map((pipe, index) => {
          const color = pipe.wasteScore > 0.8 ? 'red' : 'green'
          const decoded: [number, number][] = polyline.decode(pipe.encodedPolyline)

          return (
            <Polyline
              key={index}
              positions={decoded}
              color={color}
              weight={5}
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
          <div className="left">
          <div className="bottom-con">
            <h2>🏠 Households Heated</h2>
            {householdsPowered !== null ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#4ade80', margin: '10px 0' }}>
                  {householdsPowered.toLocaleString()}
                </p>
                <p style={{ fontSize: '1rem', color: '#ffffffcc' }}>
                  homes could be heated for the next 6 hours
                </p>
                <p style={{ fontSize: '0.85rem', color: '#ffffff80', marginTop: '8px' }}>
                  Based on predicted waste heat of <strong>{prediction?.toFixed(2)} kWh</strong>
                </p>
              </div>
            ) : (
              <p>Loading prediction...</p>
            )}
          </div>
          <div className="bottom-con">
            <div>
                 <h2>🏢 At Meta Scale</h2>
                 </div>
            {superHouseholdsPowered !== null ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#60a5fa', margin: '10px 0' }}>
                  {superHouseholdsPowered.toLocaleString()}
                </p>
                <p style={{ fontSize: '1rem', color: '#ffffffcc' }}>
                  homes could be heated for 6 hours
                </p>
                <p style={{ fontSize: '0.85rem', color: '#ffffff80', marginTop: '8px' }}>
                  If scaled to a Meta hyperscale datacenter (~{SUPER_DATACENTER_MULTIPLIER}x capacity)
                </p>
                <p style={{ fontSize: '0.75rem', color: '#ffffff60', marginTop: '4px' }}>
                  Projected waste heat: <strong>{(prediction! * SUPER_DATACENTER_MULTIPLIER).toFixed(2)} kWh</strong>
                </p>
              </div>
            ) : (
              <p>Loading prediction...</p>
            )}
          </div>
              <div className="bottom-con">
                <h2>💰 NPCF Savings</h2>
                {savingsNPCF !== null ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#4ade80', margin: '10px 0' }}>
                      ${savingsNPCF.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '1rem', color: '#ffffffcc' }}>
                      saved every 6 hours by reusing waste heat
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#ffffff80', marginTop: '8px' }}>
                      ~<strong>${(savingsNPCF * 4).toFixed(2)}</strong>/day · ~<strong>${(savingsNPCF * 4 * 365).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>/year
                    </p>
                  </div>
                ) : (
                  <p>Loading prediction...</p>
                )}
              </div>
              <div className="bottom-con">
                <h2>💰 Meta Scale Savings</h2>
                {savingsMeta !== null ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#60a5fa', margin: '10px 0' }}>
                      ${savingsMeta.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '1rem', color: '#ffffffcc' }}>
                      saved every 6 hours at hyperscale
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#ffffff80', marginTop: '8px' }}>
                      ~<strong>${(savingsMeta * 4).toFixed(2)}</strong>/day · ~<strong>${(savingsMeta * 4 * 365).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>/year
                    </p>
                  </div>
                ) : (
                  <p>Loading prediction...</p>
                )}
              </div>
          </div>
          <div className="right">
          <div className="bottom-con">
            <HeatChart onPrediction={setPrediction} />
          </div>
          </div> 
        </section>
<footer></footer>

  </div>
)
}

export default App

