from typing import Protocol, List, Dict, Any, Optional
from datetime import datetime
from backend.models import Allocation

class Command:
    def __init__(self, topic: str, payload: Dict[str, Any]):
        self.topic = topic
        self.payload = payload
        self.timestamp = datetime.now().isoformat()

class BMSAdapter(Protocol):
    def dispatch(self, commands: List[Command]) -> List[Dict[str, Any]]: ...

class MqttStubAdapter:
    """Logs the JSON commands that would be published to BACnet/MQTT brokers."""
    def __init__(self):
        self.outbox: List[Dict[str, Any]] = []

    def dispatch(self, commands: List[Command]) -> List[Dict[str, Any]]:
        results = []
        for cmd in commands:
            entry = {
                "topic": cmd.topic,
                "payload": cmd.payload,
                "dispatched_at": cmd.timestamp,
                "status": "SENT_TO_BROKER",
                "protocol": "MQTT/BACnet-Stub"
            }
            self.outbox.insert(0, entry) # newest first
            if len(self.outbox) > 100:
                self.outbox.pop()
            results.append(entry)
        return results

class SimAdapter:
    """Dispatches commands directly to the managed TwinSim engine."""
    def __init__(self, managed_sim, mqtt_stub: Optional[MqttStubAdapter] = None):
        self.managed_sim = managed_sim
        self.mqtt_stub = mqtt_stub or MqttStubAdapter()

    def apply_deal(self, deal_id: str, allocations: List[Allocation], window_start: str, window_end: str) -> List[Dict[str, Any]]:
        commands = []
        for alloc in allocations:
            if alloc.lever == "hvac":
                topic = f"campus/{alloc.zone_id}/hvac/setpoint_offset"
                payload = {
                    "offset_c": alloc.setpoint_offset_c or 1.5,
                    "target_shed_kw": alloc.shed_kw,
                    "from": window_start,
                    "to": window_end,
                    "deal_id": deal_id
                }
            elif alloc.lever == "lighting":
                topic = f"campus/{alloc.zone_id}/lighting/dim_level"
                payload = {
                    "shed_kw": alloc.shed_kw,
                    "from": window_start,
                    "to": window_end,
                    "deal_id": deal_id
                }
            elif alloc.lever in ("water", "pump"):
                topic = "campus/pumping/main_borewell/pump_state"
                payload = {
                    "state": "OFF",
                    "reason": "load_shedding_peak_shave",
                    "from": window_start,
                    "to": window_end,
                    "deal_id": deal_id
                }
            else:
                topic = f"campus/{alloc.zone_id}/circuits/{alloc.lever}"
                payload = {
                    "shed_kw": alloc.shed_kw,
                    "from": window_start,
                    "to": window_end,
                    "deal_id": deal_id
                }
            commands.append(Command(topic, payload))

        # 1. Apply to simulated physics
        self.managed_sim.apply_deal(deal_id, allocations)
        
        # 2. Also log to MQTT/BACnet outbox
        return self.mqtt_stub.dispatch(commands)

mqtt_stub = MqttStubAdapter()
