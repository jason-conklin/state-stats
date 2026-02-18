import { runMedianHouseholdIncomeIngestion } from "../ingestion/ingestMedianHouseholdIncome";

runMedianHouseholdIncomeIngestion().catch((error) => {
  console.error("[ingestMedianHouseholdIncome CLI] Failed:", error);
  process.exitCode = 1;
});
