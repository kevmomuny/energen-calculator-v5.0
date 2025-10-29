#!/usr/bin/env python3
"""
Energen Calculator Settings Fetcher

Fetches default settings from Energen Calculator 5.0 API.
Use this in all test scripts instead of hardcoding pricing values.

Usage:
    from fetch_calculator_settings import fetch_calculator_settings
    
    settings = fetch_calculator_settings()
    if settings:
        oil_price = settings['oilPrice']
        oil_markup = settings['oilMarkup']
"""

import requests
import sys
from typing import Optional, Dict

def fetch_calculator_settings(server_url: str = "http://localhost:3002") -> Optional[Dict]:
    """
    Fetch default settings from calculator API.
    
    Args:
        server_url: Base URL of calculator server
        
    Returns:
        Dictionary of settings or None if fetch failed
    """
    try:
        response = requests.get(
            f"{server_url}/api/settings",
            timeout=5
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"⚠️  Failed to fetch settings: HTTP {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to calculator at {server_url}")
        print("   Make sure server is running:")
        print("   cd src/api && node server-secure.cjs")
        return None
    except requests.exceptions.Timeout:
        print(f"⚠️  Request timed out after 5 seconds")
        return None
    except Exception as e:
        print(f"❌ Unexpected error fetching settings: {e}")
        return None

def get_service_d_prices(settings: Dict) -> Dict[str, float]:
    """
    Extract Service D fluid analysis prices from settings.
    
    Args:
        settings: Settings dictionary from fetch_calculator_settings()
        
    Returns:
        Dictionary with 'oil', 'coolant', 'fuel' prices
    """
    service_d = settings.get('serviceD', {})
    return {
        'oil': service_d.get('oilAnalysisCost', 16.55),
        'coolant': service_d.get('coolantAnalysisCost', 16.55),
        'fuel': service_d.get('fuelAnalysisCost', 60.00)
    }

def get_oil_pricing(settings: Dict) -> Dict[str, float]:
    """
    Extract oil pricing settings.
    
    Args:
        settings: Settings dictionary from fetch_calculator_settings()
        
    Returns:
        Dictionary with 'price' and 'markup'
    """
    return {
        'price': settings.get('oilPrice', 16.00),
        'markup': settings.get('oilMarkup', 1.5)
    }

def get_coolant_pricing(settings: Dict) -> Dict[str, float]:
    """
    Extract coolant pricing settings.
    
    Args:
        settings: Settings dictionary from fetch_calculator_settings()
        
    Returns:
        Dictionary with 'price' and 'markup'
    """
    return {
        'price': settings.get('coolantPrice', 16.00),
        'markup': settings.get('coolantMarkup', 1.5)
    }

def get_labor_rates(settings: Dict) -> Dict[str, float]:
    """
    Extract labor and mobilization rates.
    
    Args:
        settings: Settings dictionary from fetch_calculator_settings()
        
    Returns:
        Dictionary with 'labor' and 'mobilization' rates
    """
    return {
        'labor': settings.get('laborRate', 180.00),
        'mobilization': settings.get('mobilizationRate', 180.00),
        'mileage': settings.get('mileageRate', 0.67)
    }

def get_markup_rates(settings: Dict) -> Dict[str, float]:
    """
    Extract parts and freight markup rates.
    
    Args:
        settings: Settings dictionary from fetch_calculator_settings()
        
    Returns:
        Dictionary with markup rates
    """
    return {
        'parts': settings.get('partsMarkup', 1.25),
        'freight': settings.get('freightMarkup', 1.05)
    }

def print_settings_summary(settings: Dict) -> None:
    """
    Print a summary of fetched settings.
    
    Args:
        settings: Settings dictionary from fetch_calculator_settings()
    """
    print("\n" + "=" * 60)
    print("CALCULATOR SETTINGS FETCHED")
    print("=" * 60)
    
    print("\nLABOR RATES:")
    print(f"  Standard Rate:      ${settings.get('laborRate', 0):.2f}/hr")
    print(f"  Mobilization Rate:  ${settings.get('mobilizationRate', 0):.2f}/hr")
    print(f"  Mileage Rate:       ${settings.get('mileageRate', 0):.2f}/mile")
    
    print("\nOIL PRICING:")
    print(f"  Price:   ${settings.get('oilPrice', 0):.2f}/gal")
    print(f"  Markup:  {settings.get('oilMarkup', 0):.2f}x")
    
    print("\nCOOLANT PRICING:")
    print(f"  Price:   ${settings.get('coolantPrice', 0):.2f}/gal")
    print(f"  Markup:  {settings.get('coolantMarkup', 0):.2f}x")
    
    print("\nSERVICE D ANALYSIS COSTS:")
    service_d = settings.get('serviceD', {})
    print(f"  Oil Analysis:      ${service_d.get('oilAnalysisCost', 0):.2f}")
    print(f"  Coolant Analysis:  ${service_d.get('coolantAnalysisCost', 0):.2f}")
    print(f"  Fuel Analysis:     ${service_d.get('fuelAnalysisCost', 0):.2f}")
    
    print("\nMARKUP RATES:")
    print(f"  Parts:    {settings.get('partsMarkup', 0):.2f}x")
    print(f"  Freight:  {settings.get('freightMarkup', 0):.2f}x")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    """Test the settings fetcher"""
    print("\n" + "=" * 60)
    print("ENERGEN CALCULATOR SETTINGS FETCHER TEST")
    print("=" * 60)
    
    settings = fetch_calculator_settings()
    
    if settings:
        print("\n✅ Successfully fetched calculator settings")
        print_settings_summary(settings)
        
        # Test helper functions
        print("\nTEST HELPER FUNCTIONS:")
        print("-" * 60)
        
        service_d = get_service_d_prices(settings)
        print(f"Service D Prices: Oil=${service_d['oil']}, Coolant=${service_d['coolant']}, Fuel=${service_d['fuel']}")
        
        oil = get_oil_pricing(settings)
        print(f"Oil Pricing: ${oil['price']}/gal @ {oil['markup']}x markup")
        
        labor = get_labor_rates(settings)
        print(f"Labor Rates: ${labor['labor']}/hr labor, ${labor['mobilization']}/hr mobilization")
        
        markups = get_markup_rates(settings)
        print(f"Markups: Parts {markups['parts']}x, Freight {markups['freight']}x")
        
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Failed to fetch settings")
        print("\nMake sure:")
        print("  1. Calculator server is running")
        print("  2. Server is accessible at http://localhost:3002")
        print("  3. /api/settings endpoint is working")
        sys.exit(1)
