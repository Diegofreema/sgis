import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

const outputDir = path.join(process.cwd(), "public", "templates");
const outputPath = path.join(outputDir, "question-bank-template.xlsx");

const headers = [
  "questionText",
  "subject",
  "difficulty",
  "marks",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctOption",
  "explanation",
];

const exampleRow = [
  "Which of these is a mammal?",
  "Basic Science",
  "easy",
  1,
  "Eagle",
  "Whale",
  "Lizard",
  "Shark",
  "b",
  "Whales are mammals because they give birth to live young.",
];

const subjects = [
  "English Language",
  "Mathematics",
  "Basic Science",
  "Social Studies",
  "Civic Education",
  "Agricultural Science",
  "Computer Studies",
  "Cultural and Creative Arts",
  "Home Economics",
  "Physical and Health Education",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "French",
  "Yoruba",
  "Igbo",
  "Hausa",
];

const workbook = XLSX.utils.book_new();

const questionsSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
questionsSheet["!cols"] = [
  { wch: 42 },
  { wch: 24 },
  { wch: 14 },
  { wch: 10 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 14 },
  { wch: 52 },
];
questionsSheet["!freeze"] = { xSplit: 0, ySplit: 1 };

const rulesSheet = XLSX.utils.aoa_to_sheet([
  ["Allowed subjects", "Allowed difficulties"],
  ...subjects.map((subject, index) => [subject, index < 3 ? ["easy", "medium", "hard"][index] : ""]),
]);
rulesSheet["!cols"] = [{ wch: 32 }, { wch: 22 }];

XLSX.utils.book_append_sheet(workbook, questionsSheet, "Questions");
XLSX.utils.book_append_sheet(workbook, rulesSheet, "Reference");

await fs.mkdir(outputDir, { recursive: true });
XLSX.writeFile(workbook, outputPath);

console.log(outputPath);
