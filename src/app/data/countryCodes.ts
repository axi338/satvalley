export const countryCodes = [
    // Central Asia
    { code: "+998", country: "UZ", flag: "🇺🇿", name: "Uzbekistan" },
    { code: "+7", country: "KZ", flag: "🇰🇿", name: "Kazakhstan" },
    { code: "+996", country: "KG", flag: "🇰🇬", name: "Kyrgyzstan" },
    { code: "+992", country: "TJ", flag: "🇹🇯", name: "Tajikistan" },
    { code: "+993", country: "TM", flag: "🇹🇲", name: "Turkmenistan" },

    // Europe & Others
    { code: "+44", country: "GB", flag: "🇬🇧", name: "United Kingdom" },
    { code: "+49", country: "DE", flag: "🇩🇪", name: "Germany" },
    { code: "+33", country: "FR", flag: "🇫🇷", name: "France" },
    { code: "+39", country: "IT", flag: "🇮🇹", name: "Italy" },
    { code: "+34", country: "ES", flag: "🇪🇸", name: "Spain" },
    { code: "+7", country: "RU", flag: "🇷🇺", name: "Russia" },
    { code: "+90", country: "TR", flag: "🇹🇷", name: "Turkey" },
    { code: "+380", country: "UA", flag: "🇺🇦", name: "Ukraine" },
    { code: "+48", country: "PL", flag: "🇵🇱", name: "Poland" },
    { code: "+40", country: "RO", flag: "🇷🇴", name: "Romania" },
    { code: "+31", country: "NL", flag: "🇳🇱", name: "Netherlands" },
    { code: "+1", country: "US", flag: "🇺🇸", name: "USA" },
].sort((a, b) => a.country.localeCompare(b.country)); // Sorted by country code alphabetically or name
