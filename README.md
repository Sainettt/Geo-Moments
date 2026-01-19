# 📍 GeoMoments PWA

GeoMoments to aplikacja typu Progressive Web App (PWA) służąca do zapisywania multimedialnych wspomnień powiązanych z lokalizacją. Projekt został zrealizowany w czystym JavaScript (Vanilla JS), co zapewnia wysoką wydajność i pełną kontrolę nad kodem bez użycia zewnętrznych frameworków.

Aplikacja działa w trybie offline, wykorzystuje natywne funkcje urządzenia i może zostać zainstalowana na ekranie głównym telefonu.

## ✨ Kluczowe funkcjonalności i Wykorzystanie API

Projekt spełnia wymagania wykorzystania natywnych funkcji przeglądarki i urządzenia:

### 1. 📸 Aparat i Galeria (Camera Access)
* **Implementacja:** Wykorzystanie `HTMLInputElement` (`type="file"`) z atrybutem `accept="image/*"`.
* **Optymalizacja:** Zaimplementowano własny mechanizm kompresji zdjęć po stronie klienta przy użyciu **Canvas API** (plik `utils.js`). Zdjęcia są zmniejszane przed zapisaniem w bazie, co drastycznie zwiększa wydajność aplikacji.

### 2. 🌍 Geolokalizacja (Geolocation API)
* **Implementacja:** Użycie `navigator.geolocation.getCurrentPosition`.
* **Działanie:** Aplikacja pobiera precyzyjne współrzędne użytkownika podczas dodawania notatki. Dane te są następnie wykorzystywane do renderowania markerów na interaktywnej mapie (Leaflet.js).

### 3. 🎤 Nagrywanie Dźwięku (MediaStream Recording API)
* **Implementacja:** Wykorzystanie interfejsu `MediaRecorder`.
* **Działanie:** Użytkownik może nagrać 15-sekundową notatkę głosową. Strumień audio jest konwertowany na Blob, a następnie na format Base64 w celu przechowania w lokalnej bazie danych.

### 4. 📳 Wibracje (Vibration API)
* **Implementacja:** Użycie `navigator.vibrate()`.
* **Działanie:** Haptyczne potwierdzenie (krótka wibracja) po pomyślnym zapisaniu nowego momentu w bazie danych.

## 📡 Tryb Offline i PWA

Aplikacja została zaprojektowana w podejściu **Offline-First**:

* **Service Worker:** Plik `sw.js` implementuje strategię **Cache First**. Zasoby statyczne (HTML, CSS, JS, Ikony) są pobierane z pamięci podręcznej, co pozwala na natychmiastowe ładowanie aplikacji bez dostępu do sieci.
* **IndexedDB:** Wszystkie dane użytkownika (zdjęcia, nagrania, opisy) są przechowywane w trwałej, lokalnej bazie danych przeglądarki (`GeoMomentsDB`). Dane nie są tracone po zamknięciu karty czy restarcie urządzenia.
* **Web App Manifest:** Plik `manifest.json` definiuje aplikację jako instalowalną (kolory, ikony, tryb standalone), umożliwiając dodanie jej do ekranu głównego (A2HS).

## 🌍 Publikacja i Instalacja (Netlify)

Najprostszym sposobem na uruchomienie aplikacji na telefonie jest skorzystanie z darmowego hostingu **Netlify**, który automatycznie zapewnia bezpieczne połączenie **HTTPS** (wymagane dla kamery i GPS).

1. **Wdrożenie (Deploy):**
   * Zaloguj się do [Netlify Drop](https://app.netlify.com/drop).
   * Przeciągnij folder z projektem do obszaru "Drag and drop your site folder here".
   * Po chwili otrzymasz publiczny link do swojej aplikacji.

2. **📱 Instalacja na telefonie:**
   * Otwórz wygenerowany link na smartfonie (Android/iOS).
   * W przeglądarce wybierz opcję **"Dodaj do ekranu głównego"** (Add to Home Screen).
     * *Chrome (Android):* Menu (trzy kropki) -> Zainstaluj aplikację / Dodaj do ekranu głównego.
     * *Safari (iOS):* Przycisk Udostępnij -> Do ekranu początkowego.
   * Aplikacja pojawi się na pulpicie jako natywna ikona. Uruchom ją, aby korzystać z pełnego ekranu (bez paska adresu) i trybu offline.
