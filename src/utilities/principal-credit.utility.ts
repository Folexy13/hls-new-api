export type CreditComputation = {
  totalAmountPurchased: number;
  returns: number;
  tax: number;
  serviceCharge: number;
  amountAfterTax: number;
  hlsCommission: number;
  principalShare: number;
};

export const computePrincipalCredit = (amount: number, costPrice: number): CreditComputation => {
  const totalAmountPurchased = Math.max(0, amount);
  const returns = Math.max(0, totalAmountPurchased - Math.max(0, costPrice));
  const tax = returns * 0.075;
  const serviceCharge = returns * 0.05;
  const amountAfterTax = returns - tax;
  const hlsCommission = amountAfterTax * 0.3;
  const principalShare = Math.max(0, returns - tax - serviceCharge - hlsCommission);

  return {
    totalAmountPurchased,
    returns,
    tax,
    serviceCharge,
    amountAfterTax,
    hlsCommission,
    principalShare,
  };
};
