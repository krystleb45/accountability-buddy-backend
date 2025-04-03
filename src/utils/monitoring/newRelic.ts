// Import New Relic package
import newrelic from "newrelic"; // Make sure you have installed the `newrelic` package

// Function to initialize New Relic
const initializeNewRelic = (): void => {
  // You can configure custom settings or add additional monitoring hooks here if needed

  // Example of adding custom attributes for requests
  newrelic.setTransactionName("custom_transaction_name");

  // You can also add custom attributes to transactions if you want more granular insights.
  newrelic.addCustomAttributes({
    environment: process.env.NODE_ENV || "development",
    application: "AccountabilityBuddy"
  });

  // Example of tracking custom events
  // newrelic.recordCustomEvent('CustomEvent', { key: 'value' });

  console.warn("New Relic monitoring initialized");
};

// If you need to monitor any specific custom business transactions, use this API.
const monitorBusinessTransaction = (transactionName: string): void => {
  // You can capture custom business transactions like API calls, database queries, etc.
  newrelic.setTransactionName(transactionName);
};

export { initializeNewRelic, monitorBusinessTransaction };
