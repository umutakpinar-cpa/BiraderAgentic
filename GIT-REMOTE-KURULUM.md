# Git remote düzeltme

Eski `origin` adresi (`.../agentic.git`) GitHub’da yoksa push **Repository not found** verir.

## Adımlar

1. GitHub’da **yeni boş repo** oluştur (ör. `biraderagentic`).
2. Bu klasörde remote’u ayarla:

```bash
git remote remove origin
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git branch -M main
git push -u origin main
```

`KULLANICI_ADI` ve `REPO_ADI` kendi hesabına göre değiştir.

SSH kullanıyorsan:

```bash
git remote add origin git@github.com:KULLANICI_ADI/REPO_ADI.git
```

## Bu projede varsayılan öneri

Worker adı **biraderagentic** olduğu için repo adı olarak da **`biraderagentic`** kullanılabilir:

```bash
git remote add origin https://github.com/umutakpinar-cpa/BiraderAgentic.git
```

Repo henüz yoksa önce GitHub’da oluştur, sonra push et.
