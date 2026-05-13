import React from "react";
import { Store } from "lucide-react-native";
import BtcPaymentForm from "../components/BtcPaymentForm";

export default function BuyGoodsScreen({ navigation }) {
  return (
    <BtcPaymentForm
      navigation={navigation}
      title="Buy Goods"
      subtitle="Pay any shop or merchant by till number"
      icon={Store}
      accent="#5BC0EB"
      ctaTitle="Buy via Lightning"
      fields={[
        {
          key: "till",
          label: "Till number",
          placeholder: "e.g. 123456",
          keyboardType: "number-pad",
          validate: (v) => /^[0-9]{3,10}$/.test(v.trim()),
          errorText: "Till numbers are 3–10 digits.",
        },
        {
          key: "sspAmount",
          label: "Amount (SSP)",
          placeholder: "1500",
          keyboardType: "decimal-pad",
          validate: (v) => Number(v) > 0,
          errorText: "Enter an amount greater than zero.",
        },
      ]}
      buildPayoutParams={(v) => ({
        type: "buygoods",
        till: v.till.trim(),
        sspAmount: Number(v.sspAmount),
      })}
      summaryLines={(v, sats) => [
        { label: "Till", value: v.till },
        { label: "Amount", value: `SSP ${v.sspAmount}` },
        { label: "Sats", value: String(sats) },
      ]}
    />
  );
}
