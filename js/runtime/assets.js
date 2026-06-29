(function () {
  const runtime = window.ImpolPinballRuntime || (window.ImpolPinballRuntime = {});

  function loadAssets(config) {
    return Object.entries(config).reduce((loadedAssets, [id, asset]) => {
      const image = new Image();
      image.src = asset.src;
      loadedAssets[id] = {
        ...asset,
        image,
        loaded: false
      };
      image.addEventListener("load", () => {
        loadedAssets[id].loaded = true;
      });
      return loadedAssets;
    }, {});
  }

  function isAssetReady(assets, id) {
    return Boolean(assets[id]?.loaded);
  }

  function createAssetReadiness(assets) {
    return (id) => isAssetReady(assets, id);
  }

  runtime.assets = {
    loadAssets,
    isAssetReady,
    createAssetReadiness
  };
})();