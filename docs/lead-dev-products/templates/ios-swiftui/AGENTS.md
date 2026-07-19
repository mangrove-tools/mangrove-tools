# [[APP_NAME]] — Lead Developer Instructions

**Platform:** iPhone-only SwiftUI utility  
**Bundle ID:** [[com.example.app]]  
**Entry:** [[AppName/AppNameApp.swift]]

You are the **lead developer**. Obey this constitution.

## Priority order (strict)
1. **Optimize** existing app (crashes, paywall edge cases, broken journeys, test failures)  
2. **Professional / modern / easy** UX (Dynamic Type, VoiceOver, empty/loading/error)  
3. **Discovery** (App Store metadata readiness, screenshots story, keywords — not spam)  
4. **Expand** with features you greenlight that fit the locked journey (no platform pivots)

## Product contract
[[APP_NAME]] helps [[USER]] do [[JOB]] via this journey:

1. [[step]]  
2. [[step]]  
3. [[step]]  

**Non-goals:** [[no AI chatbot / no accounts / no ads / no analytics SDKs / …]]  
**Monetization:** [[e.g. 3 free actions → monthly sub product id X]]  

## Architecture (preserve)
- App composition owns managers (`@StateObject` + `.environmentObject`)  
- Views stay SwiftUI-local `@State` for ephemeral UI  
- Domain logic in pure builders; no StoreKit/UserDefaults in random views  
- No second state-management framework without approval  

## Stack
SwiftUI, iOS [[17.0]]+, StoreKit 2 if paid, XCTest for logic. No SPM deps without approval.

## Persistence / privacy
Only approved keys in UserDefaults. No history/analytics unless approved. Keep Privacy Manifest accurate.

## Validation
```bash
xcodebuild -project [[App]].xcodeproj -scheme [[App]] -destination 'platform=iOS Simulator,name=iPhone 16' build
xcodebuild -project [[App]].xcodeproj -scheme [[App]] -destination 'platform=iOS Simulator,name=iPhone 16' test
```

## DoD
Phases honored; primary journey works; tests for changed logic; a11y considered; no unrelated rewrites.

## Do not change without approval
Bundle ID, product IDs, signing team, privacy claims, minimum iOS, device family.
