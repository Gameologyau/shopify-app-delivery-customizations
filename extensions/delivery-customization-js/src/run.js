// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Operation} Operation
 */

/**
 * @type {FunctionRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  /**
   * @type {{
  *   CountryCode1: string
  *   CartValue1: number
  *   CountryCode2: string
  *   CartValue2: number
  *   CountryCode3: string
  *   CartValue3: number
  * }}
  */

  const ValidPostCode  =   ["3000","3002","3003","3004","3006","3006","3008","3010","3011","3012","3013","3015","3016","3018","3019","3020","3021","3022","3023","3025","3026","3027","3028","3029","3031","3032","3033","3034","3036","3037","3038","3039","3040","3041","3042","3043","3044","3045","3046","3047","3048","3049","3050","3051","3052","3053","3054","3055","3056","3057","3058","3059","3060","3061","3065","3066","3067","3068","3070","3071","3072","3073","3074","3075","3076","3078","3079","3081","3082","3083","3084","3085","3087","3088","3090","3093","3094","3095","3101","3102","3103","3104","3105","3106","3107","3108","3109","3111","3121","3122","3123","3124","3125","3126","3127","3128","3129","3130","3131","3132","3133","3135","3141","3142","3143","3144","3145","3146","3147","3148","3149","3150","3151","3152","3153","3154","3155","3156","3161","3162","3163","3165","3166","3167","3168","3169","3170","3171","3172","3173","3174","3175","3177","3178","3179","3180","3181","3182","3183","3184","3185","3186","3187","3188","3189","3190","3191","3192","3193","3194","3195","3196","3197","3198","3201","3202","3204","3205","3206","3207","3802"];   
  
  const deliveryGroups = input.cart?.deliveryGroups || [];
  const postcode = deliveryGroups[0]?.deliveryAddress?.zip;
  const provinceCode = deliveryGroups[0]?.deliveryAddress?.provinceCode;
  var HideToNightShipping = true;
  var HasPickupOnlyProducts = false;
  if(provinceCode == 'VIC')
  {
    if( ValidPostCode.includes(postcode)){
       HideToNightShipping = false;
    }
  }
  
  for( const CartLines of input.cart.lines){
      if(CartLines.merchandise.__typename ===  'ProductVariant'){
        

        var hasPickupTag = CartLines.merchandise.product.hasPickupTag;
        if(hasPickupTag){
          HasPickupOnlyProducts = true;
          break;
        }

        var hasPreorderTag = CartLines.merchandise.product.hasPreorderTag;
        if(hasPreorderTag){
          HideToNightShipping = true;
          break;
        }
        
      }
  }
  
  const configuration = JSON.parse(
    input?.deliveryCustomization?.metafield?.value ?? "{}"
  );
  
  if (configuration.CountryCode1 == '' || configuration.CartValue1 == null || configuration.CountryCode2 == '' || configuration.CartValue2 == null || configuration.CountryCode3 == '' ||  configuration.CartValue3 == null) {
    return NO_CHANGES;
  }

  const orderSubtotal = parseFloat(input.cart.cost.subtotalAmount.amount); 

  
  const ShippingCountry = deliveryGroups[0]?.deliveryAddress?.countryCode;
  if (!deliveryGroups.length) { return NO_CHANGES };

  /* if ((orderSubtotal > configuration.CartValue2 && ShippingCountry == configuration.CountryCode2) ) {
      console.log( 'NZ Condition true');
      let toHide = input.cart.deliveryGroups
      .filter(group => group.deliveryAddress?.countryCode &&
        // Use the configured province code instead of a hardcoded value
        group.deliveryAddress.countryCode == configuration.CountryCode2 )
      .flatMap(group => group.deliveryOptions)
      .map(option => /** @type {Operation} /////////({
        hide: {
          deliveryOptionHandle: option.handle,
        }
      }));

    return {
      operations: toHide
    };
  } */
  if ((orderSubtotal > configuration.CartValue3 && ShippingCountry != configuration.CountryCode2 && ShippingCountry != configuration.CountryCode1) ) {
      console.log( 'International Condition true');
      let toHide = input.cart.deliveryGroups
      .filter(group => group.deliveryAddress?.countryCode &&
        // Use the configured province code instead of a hardcoded value
        group.deliveryAddress.countryCode != configuration.CountryCode2 && group.deliveryAddress.countryCode != configuration.CountryCode1 )
      .flatMap(group => group.deliveryOptions)
      .map(option => /** @type {Operation} */({
        hide: {
          deliveryOptionHandle: option.handle,
        }
      }));

    return {
      operations: toHide
    };
  }
  else if (HasPickupOnlyProducts == true){
    console.log( 'Pickup Only Products in Cart');
    let toHideAll = input.cart.deliveryGroups
    .flatMap(group => group.deliveryOptions)
    .map(option => /** @type {Operation} */({
      hide: {
        deliveryOptionHandle: option.handle,
      }
    }));

    return {
      operations: toHideAll
    };
  }
  else if (HideToNightShipping == true) {

    console.log( 'Not Valid location for To Night Delivery Or PreOrder Products');
    var ToNightDeliveryOption = '';
    for( const group of input.cart.deliveryGroups){
      for(const option of group.deliveryOptions){
        if(option.title === 'Delivery Tonight 6-9pm (No PO Box or Business)' || option.title === 'tonite_delivery'){
          ToNightDeliveryOption = option.handle;
        }
      }
    }

    if(ToNightDeliveryOption != ''){

      const operations = [];
      if (ToNightDeliveryOption) {
        operations.push({
          hide: {
            deliveryOptionHandle: ToNightDeliveryOption,
          },
        });
      }
      return { operations };
    }
  }
  else {
    return NO_CHANGES;
  }
  
};
