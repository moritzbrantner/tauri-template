import { useMemo, useState } from "react";
import type { Messages } from "../app/messages";
import { employees, type Employee } from "../data/employees";

type TablePageProps = {
  t: Messages;
};

type SortKey = keyof Pick<Employee, "id" | "firstName" | "lastName" | "salary" | "team" | "startDate">;

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "id", label: "ID" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "team", label: "Team" },
  { key: "salary", label: "Salary" },
  { key: "startDate", label: "Start date" },
];

export function TablePage({ t }: TablePageProps) {
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const teams = useMemo(() => Array.from(new Set(employees.map((employee) => employee.team))).sort(), []);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return employees
      .filter((employee) => (activeOnly ? employee.active : true))
      .filter((employee) => (team === "all" ? true : employee.team === team))
      .filter((employee) => {
        if (!normalizedQuery) {
          return true;
        }

        return `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.team}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const direction = sortDirection === "asc" ? 1 : -1;
        const leftValue = left[sortKey];
        const rightValue = right[sortKey];

        if (typeof leftValue === "number" && typeof rightValue === "number") {
          return (leftValue - rightValue) * direction;
        }

        return String(leftValue).localeCompare(String(rightValue)) * direction;
      });
  }, [activeOnly, query, sortDirection, sortKey, team]);

  function toggleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return (
    <section className="content-stack table-page">
      <div className="section-heading">
        <p className="eyebrow">Workspace</p>
        <h1>{t.table.title}</h1>
        <p>{t.table.description}</p>
      </div>

      <div className="table-toolbar">
        <input
          aria-label={t.table.search}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t.table.search}
          value={query}
        />
        <select aria-label="Team" onChange={(event) => setTeam(event.currentTarget.value)} value={team}>
          <option value="all">{t.table.allTeams}</option>
          {teams.map((teamName) => (
            <option key={teamName}>{teamName}</option>
          ))}
        </select>
        <label className="toggle-row compact-toggle">
          <input
            checked={activeOnly}
            onChange={(event) => setActiveOnly(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>{t.table.activeOnly}</span>
        </label>
      </div>

      <p className="result-count">
        {t.table.showing} {filteredEmployees.length} {t.table.of} {employees.length}
      </p>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button onClick={() => toggleSort(column.key)} type="button">
                    {column.label}
                    {sortKey === column.key ? <span>{sortDirection === "asc" ? "Asc" : "Desc"}</span> : null}
                  </button>
                </th>
              ))}
              <th>Active</th>
              <th>Bonus</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.id}</td>
                <td>{employee.firstName}</td>
                <td>{employee.lastName}</td>
                <td>{employee.team}</td>
                <td>{formatCurrency(employee.salary)}</td>
                <td>{employee.startDate}</td>
                <td>{employee.active ? "Yes" : "No"}</td>
                <td>{employee.bonusEligible ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
