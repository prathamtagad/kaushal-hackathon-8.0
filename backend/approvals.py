import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.models import Deal, AuditEntry, Allocation

class ApprovalManager:
    def __init__(self):
        self.deals: Dict[str, Deal] = {}
        self.audit_log: List[AuditEntry] = []

    def log_event(self, category: str, action: str, actor: str, details: Dict[str, Any]):
        entry = AuditEntry(
            entry_id=f"audit-{uuid.uuid4().hex[:8]}",
            timestamp=datetime.now().isoformat(),
            category=category,
            action=action,
            actor=actor,
            details=details
        )
        self.audit_log.insert(0, entry)
        if len(self.audit_log) > 200:
            self.audit_log.pop()

    def add_deal(self, deal: Deal) -> Deal:
        self.deals[deal.deal_id] = deal
        self.log_event(
            category="deal",
            action="proposed",
            actor="GridAgent/Solver",
            details={
                "deal_id": deal.deal_id,
                "ask_id": deal.ask_id,
                "total_shed_kw": deal.total_shed_kw,
                "allocations": [a.model_dump() for a in deal.allocations],
                "solver_status": deal.solver.get("status")
            }
        )
        return deal

    def approve_deal(self, deal_id: str, actor: str = "FacilityManager") -> Optional[Deal]:
        if deal_id not in self.deals:
            return None
        deal = self.deals[deal_id]
        if deal.status == "pending":
            deal.status = "approved"
            self.log_event(
                category="deal",
                action="approved",
                actor=actor,
                details={"deal_id": deal_id, "ask_id": deal.ask_id}
            )
        return deal

    def reject_deal(self, deal_id: str, actor: str = "FacilityManager") -> Optional[Deal]:
        if deal_id not in self.deals:
            return None
        deal = self.deals[deal_id]
        if deal.status == "pending":
            deal.status = "rejected"
            self.log_event(
                category="deal",
                action="rejected",
                actor=actor,
                details={"deal_id": deal_id, "ask_id": deal.ask_id}
            )
        return deal

    def mark_applied(self, deal_id: str):
        if deal_id in self.deals:
            self.deals[deal_id].status = "applied"
            self.log_event(
                category="deal",
                action="applied_to_bms",
                actor="SimAdapter",
                details={"deal_id": deal_id}
            )

    def check_expirations(self, current_sim_time: datetime):
        for deal in self.deals.values():
            if deal.status == "pending":
                try:
                    w_start = datetime.fromisoformat(deal.window_start)
                    if current_sim_time >= w_start:
                        deal.status = "expired"
                        self.log_event(
                            category="deal",
                            action="expired",
                            actor="System",
                            details={"deal_id": deal.deal_id, "window_start": deal.window_start}
                        )
                except Exception:
                    pass

    def get_pending_deals(self) -> List[Deal]:
        return [d for d in self.deals.values() if d.status == "pending"]

    def get_all_deals(self) -> List[Deal]:
        return list(self.deals.values())

    def get_audit_log(self) -> List[AuditEntry]:
        return self.audit_log

approval_manager = ApprovalManager()
