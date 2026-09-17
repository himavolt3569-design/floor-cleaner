"use client";

import { Input, Select, Textarea } from "@/components/ui/Field";
import { NEPAL_DISTRICTS, NEPAL_PROVINCES, type NepalProvince } from "@/config/nepal";
import { LocationFill } from "./LocationFill";

export interface AddressState {
  fullName: string;
  mobile: string;
  email: string;
  province: string;
  district: string;
  municipality: string;
  ward: string;
  area: string;
  street: string;
  notes: string;
}

export const EMPTY_ADDRESS: AddressState = {
  fullName: "",
  mobile: "",
  email: "",
  province: "",
  district: "",
  municipality: "",
  ward: "",
  area: "",
  street: "",
  notes: "",
};

export function AddressForm({
  value,
  errors,
  onChange,
}: {
  value: AddressState;
  errors: Record<string, string>;
  onChange: (patch: Partial<AddressState>) => void;
}) {
  const districts = value.province
    ? (NEPAL_DISTRICTS[value.province as NepalProvince] ?? [])
    : [];

  return (
    <div>
      <LocationFill onChange={onChange} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input
        label="Full name"
        required
        autoComplete="name"
        className="sm:col-span-2"
        value={value.fullName}
        error={errors.fullName}
        onChange={(e) => onChange({ fullName: e.target.value })}
      />

      <Input
        label="Mobile number"
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98XXXXXXXX"
        hint="We will call this number about the delivery."
        value={value.mobile}
        error={errors.mobile}
        onChange={(e) => onChange({ mobile: e.target.value })}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Optional"
        value={value.email}
        error={errors.email}
        onChange={(e) => onChange({ email: e.target.value })}
      />

      <Select
        label="Province"
        required
        placeholder="Select province"
        options={NEPAL_PROVINCES.map((p) => ({ value: p, label: p }))}
        value={value.province}
        error={errors.province}
        // Changing province invalidates the district beneath it.
        onChange={(e) => onChange({ province: e.target.value, district: "", municipality: "", ward: "", area: "", street: "" })}
      />

      <Select
        label="District"
        required
        disabled={!value.province}
        placeholder={value.province ? "Select district" : "Select a province first"}
        options={districts.map((d) => ({ value: d, label: d }))}
        value={value.district}
        error={errors.district}
        onChange={(e) => onChange({ district: e.target.value, municipality: "", ward: "", area: "", street: "" })}
      />

      <Input
        label="Municipality or city"
        required
        autoComplete="address-level2"
        value={value.municipality}
        error={errors.municipality}
        onChange={(e) => onChange({ municipality: e.target.value })}
      />

      <Input
        label="Ward number"
        inputMode="numeric"
        placeholder="Optional"
        value={value.ward}
        error={errors.ward}
        onChange={(e) => onChange({ ward: e.target.value })}
      />

      <Input
        label="Area or tole"
        required
        className="sm:col-span-2"
        autoComplete="address-line1"
        value={value.area}
        error={errors.area}
        onChange={(e) => onChange({ area: e.target.value })}
      />

      <Input
        label="Street or landmark"
        className="sm:col-span-2"
        autoComplete="address-line2"
        placeholder="Optional, helps the courier find you"
        value={value.street}
        error={errors.street}
        onChange={(e) => onChange({ street: e.target.value })}
      />

      <Textarea
        label="Delivery notes"
        className="sm:col-span-2"
        placeholder="Optional"
        value={value.notes}
        error={errors.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
      </div>
    </div>
  );
}
