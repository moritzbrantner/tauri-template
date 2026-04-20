export type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
  salary: number;
  active: boolean;
  team: string;
  startDate: string;
  bonusEligible: boolean;
  managerId: number | null;
};

export const employees: Employee[] = [
  {
    id: 1001,
    firstName: "Ada",
    lastName: "Lovelace",
    birthday: "1991-12-10",
    email: "ada@example.com",
    salary: 128000,
    active: true,
    team: "Platform",
    startDate: "2021-03-15",
    bonusEligible: true,
    managerId: null,
  },
  {
    id: 1002,
    firstName: "Grace",
    lastName: "Hopper",
    birthday: "1988-01-22",
    email: "grace@example.com",
    salary: 119500,
    active: true,
    team: "Data",
    startDate: "2020-08-03",
    bonusEligible: true,
    managerId: 1001,
  },
  {
    id: 1003,
    firstName: "Katherine",
    lastName: "Johnson",
    birthday: "1994-04-07",
    email: "katherine@example.com",
    salary: 106250,
    active: true,
    team: "Product",
    startDate: "2022-01-10",
    bonusEligible: false,
    managerId: 1001,
  },
  {
    id: 1004,
    firstName: "Margaret",
    lastName: "Hamilton",
    birthday: "1986-09-18",
    email: "margaret@example.com",
    salary: 132400,
    active: true,
    team: "Platform",
    startDate: "2019-11-04",
    bonusEligible: true,
    managerId: null,
  },
  {
    id: 1005,
    firstName: "Mary",
    lastName: "Jackson",
    birthday: "1993-06-03",
    email: "mary@example.com",
    salary: 98200,
    active: false,
    team: "Support",
    startDate: "2021-06-21",
    bonusEligible: false,
    managerId: 1003,
  },
  {
    id: 1006,
    firstName: "Annie",
    lastName: "Easley",
    birthday: "1990-11-14",
    email: "annie@example.com",
    salary: 103900,
    active: true,
    team: "Design",
    startDate: "2023-02-13",
    bonusEligible: true,
    managerId: 1003,
  },
  {
    id: 1007,
    firstName: "Radia",
    lastName: "Perlman",
    birthday: "1985-08-29",
    email: "radia@example.com",
    salary: 125750,
    active: true,
    team: "Infrastructure",
    startDate: "2018-05-28",
    bonusEligible: true,
    managerId: 1004,
  },
  {
    id: 1008,
    firstName: "Evelyn",
    lastName: "Boyd",
    birthday: "1996-02-19",
    email: "evelyn@example.com",
    salary: 91300,
    active: false,
    team: "Product",
    startDate: "2022-10-17",
    bonusEligible: false,
    managerId: 1003,
  },
];
