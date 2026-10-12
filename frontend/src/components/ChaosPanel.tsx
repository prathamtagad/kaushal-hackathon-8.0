import React from 'react';
import { Flame, GraduationCap, ZapOff, Droplets, Ghost, RotateCcw, AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import { NeoCard } from './ui/NeoCard';
import { NeoBadge } from './ui/NeoBadge';
import { NeoButton } from './ui/NeoButton';

interface ChaosPanelProps {
  activeScenarios: string[];
  onTrigger: (type: string) => void;
}

export const ChaosPanel: React.FC<ChaosPanelProps> = ({ activeScenarios, onTrigger }) => {
  const isScenarioActive = (type: string) => activeScenarios.includes(type);

  const scenarios = [
    {
      id: 'heatwave',
      title: 'HEATWAVE INJECTION',
      badge: '+8°C AMBIENT SPIKE',
      color: 'bg-[#FF7B00]',
      textColor: 'text-black',
      icon: Flame,
      category: 'WEATHER & GRID',
      description: 'Pushes outdoor temperature +8°C for 6 hours. HVAC demand surges across all 4 zones, pushing baseline net import 8–15% over the 850 kW cap.',
      expected: 'Triggers Grid Agent "peak" Ask → Multi-agent shed negotiations.'
    },
    {
      id: 'exam_week',
      title: 'EXAM WEEK SCHEDULE',
      badge: 'STRICT COMFORT FLOORS',
      color: 'bg-[#3A86FF]',
      textColor: 'text-white',
      icon: GraduationCap,
      category: 'CAMPUS CALENDAR',
      description: 'Hostel and Library night occupancy surges. Stricter comfort floors are enforced: reading halls cannot exceed 27°C and tank reserve rises to 40%.',
      expected: 'Zone agents raise comfort weights (w=2.8), pushing solver to shed elsewhere.'
    },
    {
      id: 'grid_outage',
      title: 'SUBSTATION OUTAGE',
      badge: 'CAP CUT TO 340 kW (40%)',
      color: 'bg-black',
      textColor: 'text-[#FFD60A]',
      icon: ZapOff,
      category: 'GRID EMERGENCY',
      description: 'Simulates a major feeder transformer failure. Sanctioned grid cap drops by 60% for 3 hours. Campus must run primarily on rooftop solar + deep shedding.',
      expected: 'Triggers "outage" Ask with emergency maximum shedding.'
    },
    {
      id: 'tank_leak',
      title: 'WATER TANK PIPE LEAK',
      badge: '6 kL/h UNMETERED LOSS',
      color: 'bg-[#06D6A0]',
      textColor: 'text-black',
      icon: Droplets,
      category: 'INFRASTRUCTURE LEAK',
      description: 'Simulates an unobserved 6 kL/h underground pipe breach. The water residual detection algorithm identifies the anomalous drop within 3 ticks.',
      expected: 'Emits Critical Anomaly → Water Agent proposes valve branch isolation.'
    },
    {
      id: 'phantom_load',
      title: 'PHANTOM LOAD ANOMALY',
      badge: '35 kW STUCK AC/LIGHTS',
      color: 'bg-[#B388FF]',
      textColor: 'text-black',
      icon: Ghost,
      category: 'ENERGY WASTE',
      description: 'Labs and auditorium lighting & AC remain energized during zero-occupancy night hours. IsolationForest flags the anomalous consumption.',
      expected: 'Emits Anomaly → Auto-generates single-zone waste fix deal.'
    }
  ];

  return (
    <NeoCard
      title="CHAOS INJECTIONS & SCENARIO LAB"
      subtitle="LIVE STRESS TESTING ENGINE — SIMULATED UNEXPECTED CRISES"
      headerColor="orange"
      tag={activeScenarios.length > 0 ? `${activeScenarios.length} ACTIVE` : 'READY'}
      tagColor={activeScenarios.length > 0 ? 'red' : 'mint'}
      icon={<AlertTriangle className="w-5 h-5 text-black" />}
      headerAction={
        activeScenarios.length > 0 ? (
          <NeoButton
            variant="white"
            size="sm"
            onClick={() => onTrigger('reset')}
            className="text-[10px] py-1 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            RESET ALL ({activeScenarios.length})
          </NeoButton>
        ) : undefined
      }
      bodyClassName="p-3 sm:p-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {scenarios.map((scen) => {
          const active = isScenarioActive(scen.id);
          const Icon = scen.icon;

          return (
            <div
              key={scen.id}
              className={`border-[3px] border-black rounded-[4px] p-3 flex flex-col justify-between transition-all duration-100 ${
                active
                  ? 'striped-warning-tape bg-white shadow-[4px_4px_0_#000]'
                  : 'bg-white shadow-[3px_3px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000]'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-7 h-7 rounded-[3px] border-2 border-black flex items-center justify-center ${scen.color} ${scen.textColor} shadow-[1px_1px_0_#000]`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold uppercase text-xs tracking-tight">
                      {scen.title}
                    </span>
                  </div>
                  <NeoBadge variant={active ? 'red' : 'default'}>
                    {active ? 'ACTIVE' : scen.badge}
                  </NeoBadge>
                </div>

                {/* Description */}
                <p className="text-[11px] text-neutral-700 leading-relaxed font-sans mb-2 font-medium">
                  {scen.description}
                </p>

                {/* Expected response */}
                <div className="bg-[#FFF8ED] border border-black rounded-[2px] p-1.5 text-[10px] font-mono text-neutral-800 mb-3">
                  <strong className="text-black">RESPONSE:</strong> {scen.expected}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onTrigger(scen.id)}
                className={`w-full py-1.5 px-3 border-2 border-black rounded-[3px] font-['Space_Grotesk',sans-serif] font-bold text-xs uppercase transition-all duration-100 flex items-center justify-center space-x-1.5 select-none ${
                  active
                    ? 'bg-black text-[#FFD60A] shadow-[2px_2px_0_#000]'
                    : `${scen.color} ${scen.textColor} shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] active:translate-x-0.5 active:translate-y-0.5`
                }`}
              >
                {active ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>INJECTED • CLICK TO DEACTIVATE</span>
                  </>
                ) : (
                  <>
                    <Icon className="w-3.5 h-3.5" />
                    <span>TRIGGER SCENARIO</span>
                  </>
                )}
              </button>
            </div>
          );
        })}

        {/* Quick Reset Card */}
        <div className="border-[3px] border-black rounded-[4px] p-3 bg-[#FFF4E0] shadow-[3px_3px_0_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-7 h-7 rounded-[3px] bg-white border-2 border-black flex items-center justify-center shadow-[1px_1px_0_#000]">
                <RotateCcw className="w-4 h-4 text-black" />
              </div>
              <span className="font-extrabold uppercase text-xs tracking-tight">
                RESTORE NOMINAL CONDITIONS
              </span>
            </div>
            <p className="text-[11px] text-neutral-700 leading-relaxed mb-3">
              Deactivates all active stressors, restores the 850 kW sanctioned grid cap, clears pipe leaks, and returns all comfort floors to nominal defaults.
            </p>
          </div>

          <NeoButton
            variant="white"
            size="md"
            onClick={() => onTrigger('reset')}
            className="w-full text-xs py-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            RESET TO BASELINE
          </NeoButton>
        </div>
      </div>
    </NeoCard>
  );
};
