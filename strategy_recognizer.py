# strategy_recognizer.py
from datetime import date # Ensure date is available for the main execution examples.

def recognize_strategy(legs_data):
    """
    Analyzes a list of legs to identify the options strategy.
    Each leg in legs_data is expected to be a dictionary with keys:
    'action': 'BUY' or 'SELL'
    'quantity': int
    'option_type': 'CALL' or 'PUT'
    'expiration_date': date object (from datetime.date)
    'strike': float
    'premium': float
    """
    num_legs = len(legs_data)

    if num_legs == 0:
        return "Estrategia Desconocida (Sin Legs)"

    # --- Single Leg Strategies ---
    if num_legs == 1:
        leg = legs_data[0]
        if leg['action'] == 'BUY':
            if leg['option_type'] == 'CALL':
                return "Long Call"
            elif leg['option_type'] == 'PUT':
                return "Long Put"
        elif leg['action'] == 'SELL':
            if leg['option_type'] == 'CALL':
                return "Short Call"
            elif leg['option_type'] == 'PUT':
                return "Short Put"

    # --- Two Leg Strategies ---
    if num_legs == 2:
        leg1_raw, leg2_raw = legs_data[0], legs_data[1]

        if leg1_raw['expiration_date'] != leg2_raw['expiration_date']:
            return "Estrategia Personalizada (Vencimientos Diferentes)"
        if leg1_raw['quantity'] != leg2_raw['quantity']:
            return "Estrategia Personalizada (Cantidades Diferentes)"

        sorted_legs = sorted(legs_data, key=lambda x: (x['strike'], x['option_type'], x['action']))
        leg1, leg2 = sorted_legs[0], sorted_legs[1]

        if (leg1['action'] == 'BUY' and leg1['option_type'] == 'CALL' and
            leg2['action'] == 'BUY' and leg2['option_type'] == 'PUT' and
            leg1['strike'] == leg2['strike']):
            return "Long Straddle"

        if leg1['action'] == 'BUY' and leg2['action'] == 'BUY' and leg1['strike'] != leg2['strike']:
            if (leg1['option_type'] == 'CALL' and leg2['option_type'] == 'PUT') or \
               (leg1['option_type'] == 'PUT' and leg2['option_type'] == 'CALL'):
                return "Long Strangle"

        if (leg1['action'] == 'BUY' and leg1['option_type'] == 'CALL' and
            leg2['action'] == 'SELL' and leg2['option_type'] == 'CALL' and
            leg1['strike'] < leg2['strike']):
            return "Bull Call Spread"

        if (leg1['action'] == 'SELL' and leg1['option_type'] == 'PUT' and
            leg2['action'] == 'BUY' and leg2['option_type'] == 'PUT' and
            leg1['strike'] < leg2['strike']):
            return "Bear Put Spread"

        if (leg1['action'] == 'SELL' and leg1['option_type'] == 'CALL' and
            leg2['action'] == 'BUY' and leg2['option_type'] == 'CALL' and
            leg1['strike'] < leg2['strike']):
            return "Bear Call Spread"

        if (leg1['action'] == 'BUY' and leg1['option_type'] == 'PUT' and
            leg2['action'] == 'SELL' and leg2['option_type'] == 'PUT' and
            leg1['strike'] < leg2['strike']):
            return "Bull Put Spread"

    # --- Four Leg Strategies ---
    if num_legs == 4:
        first_leg = legs_data[0]
        if not all(leg['expiration_date'] == first_leg['expiration_date'] for leg in legs_data):
            return "Estrategia Personalizada (Vencimientos Diferentes)"
        if not all(leg['quantity'] == first_leg['quantity'] for leg in legs_data):
            return "Estrategia Personalizada (Cantidades Diferentes)"

        # Separate puts and calls, then sort them by strike
        puts = sorted([leg for leg in legs_data if leg['option_type'] == 'PUT'], key=lambda x: x['strike'])
        calls = sorted([leg for leg in legs_data if leg['option_type'] == 'CALL'], key=lambda x: x['strike'])

        # Check for standard Iron Condor: 2 Puts, 2 Calls
        if len(puts) == 2 and len(calls) == 2:
            # Standard Iron Condor structure:
            # Buy Put (K1 - puts[0]), Sell Put (K2 - puts[1])
            # Sell Call (K3 - calls[0]), Buy Call (K4 - calls[1])
            # Required strike order: K1 < K2 < K3 < K4

            put_k1, put_k2 = puts[0], puts[1]
            call_k3, call_k4 = calls[0], calls[1]

            # Check strike order
            if not (put_k1['strike'] < put_k2['strike'] < call_k3['strike'] < call_k4['strike']):
                return "Estrategia Personalizada (Strikes no ordenados para Iron Condor)"

            # Check actions for Iron Condor
            if (put_k1['action'] == 'BUY' and
                put_k2['action'] == 'SELL' and
                call_k3['action'] == 'SELL' and
                call_k4['action'] == 'BUY'):
                return "Iron Condor"

        # TODO: Add Butterfly Spread detection (e.g., Buy Call K1, Sell 2 Calls K2, Buy Call K3)
        # Example: 1 Buy Call (low K), 2 Sell Calls (mid K), 1 Buy Call (high K)
        # K1 < K2 < K3 and K2-K1 = K3-K2 (symmetrical)
        # All calls or all puts
        if len(calls) == 3 and len(puts) == 0: # Call Butterfly
            # calls sorted by strike: c1, c2, c3
            c1, c2, c3 = calls[0], calls[1], calls[2] # These are individual legs
            # This logic is tricky because one of the legs has double quantity or there are two distinct legs at K2
            # Assuming legs_data has distinct legs, so for a butterfly it might look like:
            # BUY C K1 (1 unit), SELL C K2 (1 unit), SELL C K2 (1 unit), BUY C K3 (1 unit)
            # OR BUY C K1 (1 unit), SELL C K2 (2 units), BUY C K3 (1 unit) - current structure has one Q per leg.
            # The current structure assumes each leg in legs_data is one entry from the form.
            # If the user entered Sell Call K2 Qty:2, it's one leg in legs_data.
            # If they added two separate Sell Call K2 Qty:1, it's two legs.
            # The current quantity check `all(leg['quantity'] == first_leg['quantity']` might interfere.
            # For now, let's assume the simpler structure of 4 distinct legs for a butterfly too, if Q=1 for all.
            # This means the existing quantity check would make standard butterflies (1x2x1 ratio) "Personalizada".
            # This section needs more thought if butterfly is a strict requirement for this version.
            # Given the plan did not explicitly list Butterfly, this can be a future enhancement.
            pass


    return "Estrategia Personalizada"


if __name__ == '__main__':
    # ... (rest of the test cases from the previous version) ...
    legs1 = [{'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 5.0}]
    print(f"Legs: {legs1} -> Strategy: {recognize_strategy(legs1)}")

    legs2 = [{'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 3.0}]
    print(f"Legs: {legs2} -> Strategy: {recognize_strategy(legs2)}")

    legs3 = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 5.0},
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 2.5}
    ]
    print(f"Legs: {legs3} -> Strategy: {recognize_strategy(legs3)}")

    legs4 = [
        {'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 2.0},
        {'action': 'BUY', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 95, 'premium': 4.0}
    ]
    print(f"Legs: {legs4} -> Strategy: {recognize_strategy(legs4)}")

    legs5 = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 3.0},
        {'action': 'BUY', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 2.5}
    ]
    print(f"Legs: {legs5} -> Strategy: {recognize_strategy(legs5)}")

    legs6 = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 95, 'premium': 2.0},
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 2.2}
    ]
    print(f"Legs: {legs6} -> Strategy: {recognize_strategy(legs6)}")

    legs_iron_condor = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 85, 'premium': 1.0}, # K1
        {'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 2.0}, # K2
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 2.5},# K3
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 1.2} # K4
    ]
    print(f"Legs: {legs_iron_condor} -> Strategy: {recognize_strategy(legs_iron_condor)}") # Expected: Iron Condor

    legs_custom_exp = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 5.0},
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,11,15), 'strike': 105, 'premium': 2.5}
    ]
    print(f"Legs: {legs_custom_exp} -> Strategy: {recognize_strategy(legs_custom_exp)}")

    legs_custom_quant = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 5.0},
        {'action': 'SELL', 'quantity': 2, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 2.5}
    ]
    print(f"Legs: {legs_custom_quant} -> Strategy: {recognize_strategy(legs_custom_quant)}")

    legs_bear_call = [
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 3.0},
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 1.0}
    ]
    print(f"Legs: {legs_bear_call} -> Strategy: {recognize_strategy(legs_bear_call)}")

    legs_bull_put = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 1.0},
        {'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 95, 'premium': 3.0}
    ]
    print(f"Legs: {legs_bull_put} -> Strategy: {recognize_strategy(legs_bull_put)}")

    legs_iron_condor_shuffled = [
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 2.5}, # K3
        {'action': 'BUY', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 85, 'premium': 1.0},  # K1
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 1.2}, # K4
        {'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 2.0}  # K2
    ]
    print(f"Legs (shuffled IC): {legs_iron_condor_shuffled} -> Strategy: {recognize_strategy(legs_iron_condor_shuffled)}") # Expected: Iron Condor

    legs_not_condor = [ # Strikes are fine, but actions are wrong for puts[0]
        {'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 85, 'premium': 1.0},
        {'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 2.0},
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 2.5},
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 1.2}
    ]
    print(f"Legs (not IC due to action): {legs_not_condor} -> Strategy: {recognize_strategy(legs_not_condor)}") # Expected: Estrategia Personalizada

    # Test wrong strike order for IC
    legs_ic_wrong_strike_order = [ # K1 < K3 < K2 < K4 --- not valid IC order
        {'action': 'BUY', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 85, 'premium': 1.0}, # K1
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 2.0}, # K3 (but it's a call)
        {'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 2.5},# K2 (but it's a put)
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 1.2} # K4
    ] # This will fail earlier because puts/calls separation won't yield 2 of each with these strikes.
      # Corrected test:
    legs_ic_wrong_strike_order_corrected = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 85, 'premium': 1.0}, # K1
        {'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 2.0},# K2 (put2.K > call1.K)
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 2.5}, # K3
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 1.2} # K4
    ]
    print(f"Legs (IC wrong strike order): {legs_ic_wrong_strike_order_corrected} -> Strategy: {recognize_strategy(legs_ic_wrong_strike_order_corrected)}")
