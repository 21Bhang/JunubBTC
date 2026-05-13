import React from "react";
import { Receipt } from "lucide-react-native";
import BtcPaymentForm from "../components/BtcPaymentForm";

export default function PayBillScreen({ navigation }) {
  return (
    <BtcPaymentForm
      navigation={navigation}
      title="Pay Bill"
      subtitle="Utilities, schools, government — anything with a paybill"
      icon={Receipt}
      accent="#F2A900"
      ctaTitle="Pay bill via Lightning"
      fields={[
        {
          key: "paybill",
          label: "Paybill number",
          placeholder: "e.g. 247247",
          keyboardType: "number-pad",
          validate: (v) => /^[0-9]{3,10}$/.test(v.trim()),
          errorText: "Paybill numbers are 3–10 digits.",
        },
        {
          key: "account",
          label: "Account number",
          placeholder: "e.g. 0712345678 or METER-001",
          autoCapitalize: "characters",
        },
        {
          key: "sspAmount",
          label: "Amount (SSP)",
          placeholder: "10000",
          keyboardType: "decimal-pad",
          validate: (v) => Number(v) > 0,
          errorText: "Enter an amount greater than zero.",
        },
      ]}
      buildPayoutParams={(v) => ({
        type: "paybill",
        paybill: v.paybill.trim(),
        account: v.account.trim(),
        sspAmount: Number(v.sspAmount),
      })}
      summaryLines={(v, sats) => [
        { label: "Paybill", value: v.paybill },
        { label: "Account", value: v.account },
        { label: "Amount", value: `SSP ${v.sspAmount}` },
        { label: "Sats", value: String(sats) },
      ]}
    />
  );
}
