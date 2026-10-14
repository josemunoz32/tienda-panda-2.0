using System;
using System.IO;
using System.IO.Compression;
using System.Linq;

class Program
{
    static string[] findFixFiles(string currentDir)
    {
        var files = Directory.GetFiles(currentDir);
        if (files.Any(f => f.EndsWith(".dll", StringComparison.OrdinalIgnoreCase) || 
                           f.EndsWith(".ini", StringComparison.OrdinalIgnoreCase) || 
                           f.EndsWith(".txt", StringComparison.OrdinalIgnoreCase) ||
                           f.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)))
        {
            return new[] { currentDir };
        }

        var subDirs = Directory.GetDirectories(currentDir);
        foreach (var s in subDirs)
        {
            var found = findFixFiles(s);
            if (found.Length > 0) return found;
        }
        return new string[0];
    }

    static void Main()
    {
        string tempZipPath = @"C:\Users\Usuario\AppData\Local\Temp\test_silksong_gofile.zip";
        string tempExtractDir = Path.Combine(Path.GetTempPath(), "test_cs_extract");
        if (Directory.Exists(tempExtractDir)) Directory.Delete(tempExtractDir, true);
        Directory.CreateDirectory(tempExtractDir);

        ZipFile.ExtractToDirectory(tempZipPath, tempExtractDir);

        string sourceCopyDir = tempExtractDir;
        var payloadDirs = findFixFiles(tempExtractDir);
        if (payloadDirs.Length > 0)
        {
            sourceCopyDir = payloadDirs[0];
        }

        Console.WriteLine("CS FOUND DIR: " + sourceCopyDir);
        var sourceFiles = Directory.GetFiles(sourceCopyDir);
        Console.WriteLine("Files count in sourceCopyDir: " + sourceFiles.Length);
        foreach (var f in sourceFiles)
        {
            Console.WriteLine("  File: " + Path.GetFileName(f));
        }
    }
}
