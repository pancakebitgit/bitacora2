# risk_calculator.py

OPTION_MULTIPLIER = 100.0

def calculate_max_risk_profit(strategy_name, legs_data):
    """
    Calculates Max Risk and Max Profit for a given strategy and its legs.
    Returns a dictionary {'max_risk': value, 'max_profit': value}
    'value' can be a float or None (for undefined/unlimited).
    Assumes legs_data contains legs with 'action', 'quantity', 'option_type',
    'strike', 'premium', and 'expiration_date' (though expiration_date is not used in these calculations).
    Quantities are per-leg, calculations here assume a single unit of the strategy.
    The total_premium_effect already accounts for per-leg quantity.
    """
    max_risk = None
    max_profit = None

    if not legs_data:
        return {'max_risk': 0.0, 'max_profit': 0.0}

    total_net_premium_all_contracts = 0
    for leg in legs_data:
        if leg['action'] == 'BUY':
            total_net_premium_all_contracts -= leg['premium'] * leg['quantity']
        else: # SELL
            total_net_premium_all_contracts += leg['premium'] * leg['quantity']

    common_quantity = legs_data[0]['quantity'] if legs_data else 1

    if strategy_name == "Long Call":
        max_risk = abs(total_net_premium_all_contracts * OPTION_MULTIPLIER)
        max_profit = None
    elif strategy_name == "Long Put":
        max_risk = abs(total_net_premium_all_contracts * OPTION_MULTIPLIER)
        max_profit = None
    elif strategy_name == "Short Call":
        max_risk = None
        max_profit = total_net_premium_all_contracts * OPTION_MULTIPLIER
    elif strategy_name == "Short Put":
        max_risk = None
        max_profit = total_net_premium_all_contracts * OPTION_MULTIPLIER

    elif strategy_name == "Bull Call Spread":
        lower_strike_leg = min((leg for leg in legs_data if leg['option_type'] == 'CALL'), key=lambda x: x['strike'])
        higher_strike_leg = max((leg for leg in legs_data if leg['option_type'] == 'CALL'), key=lambda x: x['strike'])

        net_debit_total = abs(total_net_premium_all_contracts)
        max_risk = net_debit_total * OPTION_MULTIPLIER

        strike_diff = higher_strike_leg['strike'] - lower_strike_leg['strike']
        max_profit = (strike_diff * common_quantity - net_debit_total) * OPTION_MULTIPLIER

    elif strategy_name == "Bear Put Spread":
        lower_strike_leg = min((leg for leg in legs_data if leg['option_type'] == 'PUT'), key=lambda x: x['strike'])
        higher_strike_leg = max((leg for leg in legs_data if leg['option_type'] == 'PUT'), key=lambda x: x['strike'])

        net_debit_total = abs(total_net_premium_all_contracts)
        max_risk = net_debit_total * OPTION_MULTIPLIER
        strike_diff = higher_strike_leg['strike'] - lower_strike_leg['strike']
        max_profit = (strike_diff * common_quantity - net_debit_total) * OPTION_MULTIPLIER

    elif strategy_name == "Bear Call Spread":
        lower_strike_leg = min((leg for leg in legs_data if leg['option_type'] == 'CALL'), key=lambda x: x['strike'])
        higher_strike_leg = max((leg for leg in legs_data if leg['option_type'] == 'CALL'), key=lambda x: x['strike'])

        net_credit_total = total_net_premium_all_contracts
        max_profit = net_credit_total * OPTION_MULTIPLIER
        strike_diff = higher_strike_leg['strike'] - lower_strike_leg['strike']
        max_risk = (strike_diff * common_quantity - net_credit_total) * OPTION_MULTIPLIER

    elif strategy_name == "Bull Put Spread":
        lower_strike_leg = min((leg for leg in legs_data if leg['option_type'] == 'PUT'), key=lambda x: x['strike'])
        higher_strike_leg = max((leg for leg in legs_data if leg['option_type'] == 'PUT'), key=lambda x: x['strike'])

        net_credit_total = total_net_premium_all_contracts
        max_profit = net_credit_total * OPTION_MULTIPLIER
        strike_diff = higher_strike_leg['strike'] - lower_strike_leg['strike']
        max_risk = (strike_diff * common_quantity - net_credit_total) * OPTION_MULTIPLIER

    elif strategy_name == "Long Straddle" or strategy_name == "Long Strangle":
        max_risk = abs(total_net_premium_all_contracts * OPTION_MULTIPLIER)
        max_profit = None

    elif strategy_name == "Iron Condor":
        net_credit_total = total_net_premium_all_contracts
        max_profit = net_credit_total * OPTION_MULTIPLIER

        puts = sorted([leg for leg in legs_data if leg['option_type'] == 'PUT'], key=lambda x: x['strike'])
        calls = sorted([leg for leg in legs_data if leg['option_type'] == 'CALL'], key=lambda x: x['strike'])

        if len(puts) == 2 and len(calls) == 2:
            width_put_spread = puts[1]['strike'] - puts[0]['strike']
            width_call_spread = calls[1]['strike'] - calls[0]['strike']

            max_risk_from_put_side = (width_put_spread * common_quantity - net_credit_total) * OPTION_MULTIPLIER
            max_risk_from_call_side = (width_call_spread * common_quantity - net_credit_total) * OPTION_MULTIPLIER
            max_risk = max(max_risk_from_put_side, max_risk_from_call_side)
        else:
            max_risk = None

    if strategy_name == "Estrategia Personalizada":
        if all(leg['action'] == 'BUY' for leg in legs_data):
             max_risk = abs(total_net_premium_all_contracts * OPTION_MULTIPLIER)
             max_profit = None
        elif all(leg['action'] == 'SELL' for leg in legs_data):
             max_profit = total_net_premium_all_contracts * OPTION_MULTIPLIER
             max_risk = None

    if isinstance(max_risk, (int, float)):
        max_risk = abs(round(max_risk, 2))
    if isinstance(max_profit, (int, float)):
        max_profit = round(max_profit, 2)

    return {'max_risk': max_risk, 'max_profit': max_profit}


if __name__ == '__main__':
    from datetime import date

    print("--- Risk/Profit Calculations ---")

    legs_lc = [{'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 5.0}]
    print(f"Long Call (Q:1): {calculate_max_risk_profit('Long Call', legs_lc)}")

    legs_lc_10 = [{'action': 'BUY', 'quantity': 10, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 5.0}]
    print(f"Long Call (Q:10): {calculate_max_risk_profit('Long Call', legs_lc_10)}")

    legs_sc = [{'action': 'SELL', 'quantity': 2, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 2.0}]
    print(f"Short Call (Q:2): {calculate_max_risk_profit('Short Call', legs_sc)}")

    legs_bcs = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 5.0},
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 2.5}
    ]
    print(f"Bull Call Spread (Q:1): {calculate_max_risk_profit('Bull Call Spread', legs_bcs)}")

    legs_bcs_5 = [
        {'action': 'BUY', 'quantity': 5, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 5.0},
        {'action': 'SELL', 'quantity': 5, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 2.5}
    ]
    print(f"Bull Call Spread (Q:5): {calculate_max_risk_profit('Bull Call Spread', legs_bcs_5)}")

    legs_bear_call_credit = [
        {'action': 'SELL', 'quantity': 3, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 3.0},
        {'action': 'BUY', 'quantity': 3, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 1.0}
    ]
    print(f"Bear Call Spread (Q:3): {calculate_max_risk_profit('Bear Call Spread', legs_bear_call_credit)}")

    legs_ic = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 85, 'premium': 1.0},
        {'action': 'SELL', 'quantity': 1, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 2.0},
        {'action': 'SELL', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 2.5},
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 1.2}
    ]
    print(f"Iron Condor (Q:1): {calculate_max_risk_profit('Iron Condor', legs_ic)}")

    legs_ic_2 = [
        {'action': 'BUY', 'quantity': 2, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 85, 'premium': 1.0},
        {'action': 'SELL', 'quantity': 2, 'option_type': 'PUT', 'expiration_date': date(2024,12,20), 'strike': 90, 'premium': 2.0},
        {'action': 'SELL', 'quantity': 2, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 2.5},
        {'action': 'BUY', 'quantity': 2, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 1.2}
    ]
    print(f"Iron Condor (Q:2): {calculate_max_risk_profit('Iron Condor', legs_ic_2)}")

    legs_custom_all_buy = [
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 100, 'premium': 5.0},
        {'action': 'BUY', 'quantity': 1, 'option_type': 'CALL', 'expiration_date': date(2024,12,20), 'strike': 105, 'premium': 2.5}
    ]
    print(f"Custom (all buy): {calculate_max_risk_profit('Estrategia Personalizada', legs_custom_all_buy)}")
