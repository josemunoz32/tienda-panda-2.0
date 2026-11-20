using System;
using System.Collections.Concurrent;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media.Imaging;

namespace PandaStoreLauncher.Helpers
{
    /// <summary>
    /// Convierte una URL de carátula en un BitmapImage reducido (DecodePixelWidth) y cacheado en memoria.
    /// Evita volver a descargar/decodificar imágenes al cambiar de pestaña o filtrar, y reduce el uso de RAM.
    /// </summary>
    public class CachedImageConverter : IValueConverter
    {
        private static readonly ConcurrentDictionary<string, BitmapImage> Cache = new ConcurrentDictionary<string, BitmapImage>();

        public int DecodeWidth { get; set; } = 400;

        public object? Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is not string url || string.IsNullOrWhiteSpace(url)) return null;
            string key = url + "|" + DecodeWidth;
            return Cache.GetOrAdd(key, _ =>
            {
                var bmp = new BitmapImage();
                bmp.BeginInit();
                bmp.UriSource = new Uri(url, UriKind.Absolute);
                bmp.DecodePixelWidth = DecodeWidth;
                bmp.CacheOption = BitmapCacheOption.OnLoad;
                bmp.CreateOptions = BitmapCreateOptions.IgnoreColorProfile;
                bmp.EndInit();
                return bmp;
            });
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotSupportedException();
    }
}
