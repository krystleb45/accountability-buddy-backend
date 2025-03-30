export const mapStripeStatusToCustomStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
    incomplete: "incomplete",
    incomplete_expired: "expired",
    trialing: "trialing",
  };

  return statusMap[status] || "unknown";
};
