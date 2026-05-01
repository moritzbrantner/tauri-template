import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { employees } from "../../../data/employees";
import type { Employee, Permission } from "../types";

type PermissionCheck = (permission: Permission) => boolean;
type AuditWriter = (surface: string, title: string, body: string, unread?: boolean) => void;

export function useApprovalsFlow(hasPermission: PermissionCheck, enqueueAudit: AuditWriter) {
  const [reviewQuery, setReviewQuery] = useState("");
  const deferredReviewQuery = useDeferredValue(reviewQuery);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    employees[0]?.id ?? null,
  );
  const [approvedEmployeeIds, setApprovedEmployeeIds] = useState<number[]>([]);
  const [approvalNotice, setApprovalNotice] = useState("");

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = deferredReviewQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      if (!normalizedQuery) {
        return true;
      }

      return `${employee.firstName} ${employee.lastName} ${employee.team} ${employee.email}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [deferredReviewQuery]);

  useEffect(() => {
    if (filteredEmployees.length === 0) {
      setSelectedEmployeeId(null);
      return;
    }

    if (!filteredEmployees.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [filteredEmployees, selectedEmployeeId]);

  const selectedEmployee =
    filteredEmployees.find((employee) => employee.id === selectedEmployeeId) ??
    employees.find((employee) => employee.id === selectedEmployeeId) ??
    null;

  function approveSelectedEmployee() {
    if (!hasPermission("approvals.write")) {
      setApprovalNotice("Approving an operator requires approvals.write.");
      return;
    }

    if (!selectedEmployee) {
      return;
    }

    setApprovedEmployeeIds((current) =>
      current.includes(selectedEmployee.id) ? current : [...current, selectedEmployee.id],
    );
    setApprovalNotice(
      `${selectedEmployee.firstName} ${selectedEmployee.lastName} was approved as the accountable launch operator.`,
    );
    enqueueAudit(
      "Approvals",
      "Operator approved",
      `${selectedEmployee.firstName} ${selectedEmployee.lastName} is now attached to the release decision record.`,
    );
  }

  function selectEmployee(employee: Employee) {
    setSelectedEmployeeId(employee.id);
    setApprovalNotice("");
  }

  return {
    approvalCount: approvedEmployeeIds.length,
    approvalNotice,
    approveSelectedEmployee,
    approvedEmployeeIds,
    filteredEmployees,
    reviewQuery,
    selectEmployee,
    selectedEmployee,
    setReviewQuery,
  };
}

