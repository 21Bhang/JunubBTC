import React from "react";
import { ArrowUpRight } from "lucide-react-native";
import BtcPaymentForm from "../components/BtcPaymentForm";

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,}$/;

export default function SendMoneyScreen({ navigation }) {
  return (
    <BtcPaymentForm
      navigation={navigation}
      title="Send Money"
      subtitle="Pay any MoMo / mGURUSH number"
      icon={ArrowUpRight}
      accent="#3DDC97"
      ctaTitle="Send via Lightning"
      fields={[
        {
          key: "phone",
          label: "Recipient phone number",
          placeholder: "+211 9XX XXX XXX",
          keyboardType: "phone-pad",
          validate: (v) => PHONE_RE.test(v.replace(/\s/g, "")),
          errorText: "Enter a valid phone number.",
        },
        {
          key: "sspAmount",
          label: "Amount (SSP)",
          placeholder: "5000",
          keyboardType: "decimal-pad",
          validate: (v) => Number(v) > 0,
          errorText: "Enter an amount greater than zero.",
        },
      ]}
      buildPayoutParams={(v) => ({
        type: "send",
        phone: v.phone.trim(),
        sspAmount: Number(v.sspAmount),
      })}
      summaryLines={(v, sats) => [
        { label: "Send to", value: v.phone },
        { label: "Amount", value: `SSP ${v.sspAmount}` },
        { label: "Sats", value: String(sats) },
      ]}
    />
  );
}
