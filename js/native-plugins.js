// Подключение Capacitor-плагинов (только для бандла www / iOS / Android)
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';

window.__cap = {
    Capacitor,
    StatusBar,
    Style,
    SplashScreen,
    Haptics,
    ImpactStyle,
    App,
};
