import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  useActionData,
  useNavigation,
  useSubmit,
  useLoaderData,
} from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

interface LoaderData {
  headers: { "Content-Type": string };
  body: string;
}

interface ActionData {
  errors: Array<{ message: string }>;
}

interface DeliveryCustomizationData {
  CountryCode1: string;
  CountryCode2: string;
  CartValue: number;
}

export const loader = async ({ params, request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const { id } = params;
  const { admin } = await authenticate.admin(request);

  if (id !== "new") {
    const gid = `gid://shopify/DeliveryCustomization/${id}`;

    const response = await admin.graphql(
      `#graphql
        query getDeliveryCustomization($id: ID!) {
          deliveryCustomization(id: $id) {
            id
            title
            enabled
            metafield(namespace: "$app:delivery-customization", key: "function-configuration") {
              id
              value
            }
          }
        }`,
      {
        variables: {
          id: gid,
        },
      }
    );

    const responseJson = await response.json();
    const deliveryCustomization = responseJson.data.deliveryCustomization;
    const metafieldValue = JSON.parse(deliveryCustomization.metafield.value);

    return {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        CountryCode1: metafieldValue.CountryCode1,
        CountryCode2: metafieldValue.CountryCode2,
        CartValue: metafieldValue.CartValue,
      }),
    };
  }

  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CountryCode1: "",
      CountryCode2: "",
      CartValue: "",
    }),
  };
};

export const action = async ({ params, request }: ActionFunctionArgs): Promise<ActionData> => {
  const { functionId, id } = params;
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const CountryCode1 = formData.get("CountryCode1") as string;
  const CountryCode2 = formData.get("CountryCode2") as string;
  const CartValue = formData.get("CartValue");

  const deliveryCustomizationInput = {
    functionId,
    title: `Hide Delivery Message when Country is not ${CountryCode1} or ${CountryCode2} and Cart Value > ${CartValue}`,
    enabled: true,
    metafields: [
      {
        namespace: "$app:delivery-customization",
        key: "function-configuration",
        type: "json",
        value: JSON.stringify({
          CountryCode1,
          CountryCode2,
          CartValue,
        }),
      },
    ],
  };

  if (id !== "new") {
    const response = await admin.graphql(
      `#graphql
        mutation updateDeliveryCustomization($id: ID!, $input: DeliveryCustomizationInput!) {
          deliveryCustomizationUpdate(id: $id, deliveryCustomization: $input) {
            deliveryCustomization {
              id
            }
            userErrors {
              message
            }
          }
        }`,
      {
        variables: {
          id: `gid://shopify/DeliveryCustomization/${id}`,
          input: deliveryCustomizationInput,
        },
      }
    );

    const responseJson = await response.json();
    const errors = responseJson.data.deliveryCustomizationUpdate?.userErrors;

    return { errors };
  } else {
    const response = await admin.graphql(
      `#graphql
        mutation createDeliveryCustomization($input: DeliveryCustomizationInput!) {
          deliveryCustomizationCreate(deliveryCustomization: $input) {
            deliveryCustomization {
              id
            }
            userErrors {
              message
            }
          }
        }`,
      {
        variables: {
          input: deliveryCustomizationInput,
        },
      }
    );

    const responseJson = await response.json();
    const errors = responseJson.data.deliveryCustomizationCreate?.userErrors;

    return { errors };
  }
};

export default function DeliveryCustomization() {
  const submit = useSubmit();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const loaderData = useLoaderData<LoaderData>();

  const parsedLoaderData: DeliveryCustomizationData = loaderData?.body
    ? JSON.parse(loaderData.body)
    : { CountryCode1: "", CountryCode2: "",  CartValue: "" };

  const [CountryCode1, setCountryCode1] = useState(parsedLoaderData.CountryCode1);
  const [CountryCode2, setCountryCode2] = useState(parsedLoaderData.CountryCode2);
  const [CartValue, setCartValue] = useState(parsedLoaderData.CartValue);

  useEffect(() => {
    if (loaderData?.body) {
      const parsedData: DeliveryCustomizationData = JSON.parse(loaderData.body);
      setCountryCode1(parsedData.CountryCode1 || "");
      setCountryCode2(parsedData.CountryCode2 || "");
      setCartValue(parsedData.CartValue || 0);
    }
  }, [loaderData]);

  const isLoading = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.errors.length === 0) {
      open('shopify:admin/settings/shipping/customizations', '_top')
    }
  }, [actionData?.errors]);

  const errorBanner = actionData?.errors.length ? (
    <s-banner tone="critical" heading="There was an error creating the customization.">
      <ul>
        {actionData?.errors.map((error, index) => (
          <li key={index}>{error.message}</li>
        ))}
      </ul>
    </s-banner>
  ) : null;

const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  submit({ CountryCode1, CountryCode2, CartValue }, { method: "post" });
};

const handleReset = () => {
  setCountryCode1(parsedLoaderData.CountryCode1);
  setCountryCode2(parsedLoaderData.CountryCode2);
  setCartValue(parsedLoaderData.CartValue);
};

return (
  <form data-save-bar onSubmit={handleSubmit} onReset={handleReset}>
    <s-page heading="Change delivery message">
        <s-link slot="breadcrumb-actions" href="shopify:admin/settings/shipping/customizations">Delivery customizations</s-link>

      {errorBanner}

      <s-section>
        <s-grid gap="base" gridTemplateColumns="1fr 1fr">
          <s-text-field
            name="CountryCode1"
            label="Country code"
            value={CountryCode1}
            required
            disabled={isLoading}
            onInput={(e: any) => setCountryCode1((e.target as HTMLInputElement).value)}
          ></s-text-field>

          <s-text-field
            name="CountryCode2"
            label="Country code"
            value={CountryCode2}
            required
            disabled={isLoading}
            onInput={(e: any) => setCountryCode2((e.target as HTMLInputElement).value)}
          ></s-text-field>
        </s-grid>
        <s-grid gap="base" gridTemplateColumns="1fr 1fr">
          <s-number-field
            name="CartValue"
            label="Cart Value" 
            value={CartValue} 
            required
            disabled={isLoading}
            onInput={(e: any) => setCartValue(e.target.value)}
          />
        </s-grid>
      </s-section>
    </s-page>
  </form>
);
}
