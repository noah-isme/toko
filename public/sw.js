if (!self.define) {
  let e,
    s = {};
  const c = (c, a) => (
    (c = new URL(c + '.js', a).href),
    s[c] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          (e.src = c), (e.onload = s), document.head.appendChild(e);
        } else (e = c), importScripts(c), s();
      }).then(() => {
        let e = s[c];
        if (!e) throw new Error(`Module ${c} didn’t register its module`);
        return e;
      })
  );
  self.define = (a, t) => {
    const n = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[n]) return;
    let i = {};
    const r = (e) => c(e, n),
      d = { module: { uri: n }, exports: i, require: r };
    s[n] = Promise.all(a.map((e) => d[e] || r(e))).then((e) => (t(...e), i));
  };
}
define(['./workbox-ee5ddb69'], function (e) {
  'use strict';
  importScripts('fallback-_bx08IMiX5P1msQj0q35T.js'),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/static/_bx08IMiX5P1msQj0q35T/_buildManifest.js',
          revision: 'edd24e8d134fd1257a76d0ab7e08ab0b',
        },
        {
          url: '/_next/static/_bx08IMiX5P1msQj0q35T/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/_next/static/chunks/1416-a41ea6d3ccac1ca1.js', revision: 'a41ea6d3ccac1ca1' },
        { url: '/_next/static/chunks/155-baadac0a5a93c5f9.js', revision: 'baadac0a5a93c5f9' },
        { url: '/_next/static/chunks/1663-84a969bb5d7678e0.js', revision: '84a969bb5d7678e0' },
        { url: '/_next/static/chunks/1851-af9be7bd0ca0016b.js', revision: 'af9be7bd0ca0016b' },
        { url: '/_next/static/chunks/2043-37025694ec26ac1b.js', revision: '37025694ec26ac1b' },
        { url: '/_next/static/chunks/2054-ca4091bf94869d67.js', revision: 'ca4091bf94869d67' },
        { url: '/_next/static/chunks/2333-4974e38c35902a89.js', revision: '4974e38c35902a89' },
        { url: '/_next/static/chunks/2550.e7fac1c08cd5e371.js', revision: 'e7fac1c08cd5e371' },
        { url: '/_next/static/chunks/258.68bc8c019253bb53.js', revision: '68bc8c019253bb53' },
        { url: '/_next/static/chunks/272.5a12d5abc88005ff.js', revision: '5a12d5abc88005ff' },
        { url: '/_next/static/chunks/2745.a392b77ad0111cca.js', revision: 'a392b77ad0111cca' },
        { url: '/_next/static/chunks/2786-ba45e385d4924159.js', revision: 'ba45e385d4924159' },
        { url: '/_next/static/chunks/2853-f85a00751514b4c5.js', revision: 'f85a00751514b4c5' },
        { url: '/_next/static/chunks/28efd8eb.77d030dec55ff852.js', revision: '77d030dec55ff852' },
        { url: '/_next/static/chunks/317.7bd97704c1181568.js', revision: '7bd97704c1181568' },
        { url: '/_next/static/chunks/3182.12520b3da7e7687f.js', revision: '12520b3da7e7687f' },
        { url: '/_next/static/chunks/3230-8c9403f38c57c7ba.js', revision: '8c9403f38c57c7ba' },
        { url: '/_next/static/chunks/3296-25d767c38d50ca45.js', revision: '25d767c38d50ca45' },
        { url: '/_next/static/chunks/3345-c782d4be4d69f2f7.js', revision: 'c782d4be4d69f2f7' },
        { url: '/_next/static/chunks/3423-4b0912fb0a3f2f16.js', revision: '4b0912fb0a3f2f16' },
        { url: '/_next/static/chunks/350-bd42208f6d5cce07.js', revision: 'bd42208f6d5cce07' },
        { url: '/_next/static/chunks/3882.3da613d572fd5568.js', revision: '3da613d572fd5568' },
        { url: '/_next/static/chunks/3952-e8b7cf155d07dbf4.js', revision: 'e8b7cf155d07dbf4' },
        { url: '/_next/static/chunks/4088-d1c208190aae40eb.js', revision: 'd1c208190aae40eb' },
        { url: '/_next/static/chunks/4293-b2954c05971538f9.js', revision: 'b2954c05971538f9' },
        { url: '/_next/static/chunks/4658-3f55e89baadc1729.js', revision: '3f55e89baadc1729' },
        { url: '/_next/static/chunks/4698-45cb3d34757583d2.js', revision: '45cb3d34757583d2' },
        { url: '/_next/static/chunks/4758-d6680810482250d3.js', revision: 'd6680810482250d3' },
        { url: '/_next/static/chunks/4847-b37c718a6a2cf8c1.js', revision: 'b37c718a6a2cf8c1' },
        { url: '/_next/static/chunks/4917.e37b2a7ece35d808.js', revision: 'e37b2a7ece35d808' },
        { url: '/_next/static/chunks/4c1477ee-d6b94b0b3ba3d839.js', revision: 'd6b94b0b3ba3d839' },
        { url: '/_next/static/chunks/4f307d2d.7268101ffd056af1.js', revision: '7268101ffd056af1' },
        { url: '/_next/static/chunks/5308-cf7fb08939acfffb.js', revision: 'cf7fb08939acfffb' },
        { url: '/_next/static/chunks/5486-337b16f55cf8b35b.js', revision: '337b16f55cf8b35b' },
        { url: '/_next/static/chunks/5529-d0623ea79e585d8f.js', revision: 'd0623ea79e585d8f' },
        { url: '/_next/static/chunks/5707-a152bcd83df4b58f.js', revision: 'a152bcd83df4b58f' },
        { url: '/_next/static/chunks/5742-7ed72df510de2315.js', revision: '7ed72df510de2315' },
        { url: '/_next/static/chunks/5771-a5185e380e59a03d.js', revision: 'a5185e380e59a03d' },
        { url: '/_next/static/chunks/5786-5481cbc4d81b0457.js', revision: '5481cbc4d81b0457' },
        { url: '/_next/static/chunks/5874-d7c5b16c1424b786.js', revision: 'd7c5b16c1424b786' },
        { url: '/_next/static/chunks/6299-38781844343c031f.js', revision: '38781844343c031f' },
        { url: '/_next/static/chunks/645-02bb59832d56afeb.js', revision: '02bb59832d56afeb' },
        { url: '/_next/static/chunks/6534-af89b559a5f02fc5.js', revision: 'af89b559a5f02fc5' },
        { url: '/_next/static/chunks/6604-1d3ad4e20e3525fb.js', revision: '1d3ad4e20e3525fb' },
        { url: '/_next/static/chunks/6613-3359586d5de7fe8f.js', revision: '3359586d5de7fe8f' },
        { url: '/_next/static/chunks/663.34a9679b67258881.js', revision: '34a9679b67258881' },
        { url: '/_next/static/chunks/6635-5809f4fc7467af24.js', revision: '5809f4fc7467af24' },
        { url: '/_next/static/chunks/6645-6d249261c207895c.js', revision: '6d249261c207895c' },
        { url: '/_next/static/chunks/6658-7de8eb2ce4848744.js', revision: '7de8eb2ce4848744' },
        { url: '/_next/static/chunks/6797-48bde5a130d30101.js', revision: '48bde5a130d30101' },
        { url: '/_next/static/chunks/6870-fc6ee04bc1c3a39a.js', revision: 'fc6ee04bc1c3a39a' },
        { url: '/_next/static/chunks/7045-d210a1314bcaa76b.js', revision: 'd210a1314bcaa76b' },
        { url: '/_next/static/chunks/7105.29077f8606ef795b.js', revision: '29077f8606ef795b' },
        { url: '/_next/static/chunks/7132-224c7bc139c190b6.js', revision: '224c7bc139c190b6' },
        { url: '/_next/static/chunks/7257-6a21bd6537d39855.js', revision: '6a21bd6537d39855' },
        { url: '/_next/static/chunks/7280.a0340bfb399442da.js', revision: 'a0340bfb399442da' },
        { url: '/_next/static/chunks/7286-b65dcc89a8d3650d.js', revision: 'b65dcc89a8d3650d' },
        { url: '/_next/static/chunks/7392-e8845d470d6c00fc.js', revision: 'e8845d470d6c00fc' },
        { url: '/_next/static/chunks/7443.567cc282262ef923.js', revision: '567cc282262ef923' },
        { url: '/_next/static/chunks/7481-c25d3d43d237d971.js', revision: 'c25d3d43d237d971' },
        { url: '/_next/static/chunks/7634-fe44aa69aaa7272f.js', revision: 'fe44aa69aaa7272f' },
        { url: '/_next/static/chunks/7996-13d6971d7317c0f3.js', revision: '13d6971d7317c0f3' },
        { url: '/_next/static/chunks/8120-984e1669dd6f0929.js', revision: '984e1669dd6f0929' },
        { url: '/_next/static/chunks/8371-859ef2c964307efc.js', revision: '859ef2c964307efc' },
        { url: '/_next/static/chunks/8684-f063565de9dcbba8.js', revision: 'f063565de9dcbba8' },
        { url: '/_next/static/chunks/875.14370acfd1438737.js', revision: '14370acfd1438737' },
        { url: '/_next/static/chunks/8938-20b35e142ba271e8.js', revision: '20b35e142ba271e8' },
        { url: '/_next/static/chunks/9049-37b25621d44476f5.js', revision: '37b25621d44476f5' },
        { url: '/_next/static/chunks/9082.7762feb01355d633.js', revision: '7762feb01355d633' },
        { url: '/_next/static/chunks/9336-259f3decc5ed4a35.js', revision: '259f3decc5ed4a35' },
        { url: '/_next/static/chunks/9461.86491af8803d7c5e.js', revision: '86491af8803d7c5e' },
        { url: '/_next/static/chunks/9505-b1c29d9c070af005.js', revision: 'b1c29d9c070af005' },
        { url: '/_next/static/chunks/9515-2422cf3976e15a89.js', revision: '2422cf3976e15a89' },
        { url: '/_next/static/chunks/9579-ddc10446059b687a.js', revision: 'ddc10446059b687a' },
        { url: '/_next/static/chunks/9631.d652a2aac3482c4d.js', revision: 'd652a2aac3482c4d' },
        { url: '/_next/static/chunks/970.6423e5e5d87cddaa.js', revision: '6423e5e5d87cddaa' },
        { url: '/_next/static/chunks/9758-730505a8df67d7b3.js', revision: '730505a8df67d7b3' },
        { url: '/_next/static/chunks/9798-ba038b364f7a0bdb.js', revision: 'ba038b364f7a0bdb' },
        { url: '/_next/static/chunks/9900-c5ae77b0e61155da.js', revision: 'c5ae77b0e61155da' },
        { url: '/_next/static/chunks/9b68ed5f.a287221841587f6c.js', revision: 'a287221841587f6c' },
        {
          url: '/_next/static/chunks/app/(admin)/admin/analytics/page-0c031e4546bbd9e3.js',
          revision: '0c031e4546bbd9e3',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/audit-logs/page-e278a9276f9ab4b0.js',
          revision: 'e278a9276f9ab4b0',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/brands/page-493584d8e188aa65.js',
          revision: '493584d8e188aa65',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/categories/page-55597ca2b3cbc530.js',
          revision: '55597ca2b3cbc530',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/customers/page-bacbd588e06b266b.js',
          revision: 'bacbd588e06b266b',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/flash-sales/%5Bid%5D/edit/page-a9ed56267cd361f0.js',
          revision: 'a9ed56267cd361f0',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/flash-sales/new/page-58f683e38e0d2c1c.js',
          revision: '58f683e38e0d2c1c',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/flash-sales/page-aeec9d7affece2f4.js',
          revision: 'aeec9d7affece2f4',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/inventory/page-c74dabf23f416c16.js',
          revision: 'c74dabf23f416c16',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/orders/page-6d22da3d14a97864.js',
          revision: '6d22da3d14a97864',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/page-d1e28e28619f345f.js',
          revision: 'd1e28e28619f345f',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/products/%5Bid%5D/edit/page-fcf0bfa97575b750.js',
          revision: 'fcf0bfa97575b750',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/products/new/page-83bca80ce3a1b0c2.js',
          revision: '83bca80ce3a1b0c2',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/products/page-fbcedfe4107201ec.js',
          revision: 'fbcedfe4107201ec',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/returns/page-d99c239b52570d88.js',
          revision: 'd99c239b52570d88',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/settings/page-78f22ad67fe9d9b5.js',
          revision: '78f22ad67fe9d9b5',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/support/page-c156dc2ddf6810e4.js',
          revision: 'c156dc2ddf6810e4',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/vouchers/page-70641f39c6d90240.js',
          revision: '70641f39c6d90240',
        },
        {
          url: '/_next/static/chunks/app/(admin)/admin/webhooks/page-374a9df237a1bf46.js',
          revision: '374a9df237a1bf46',
        },
        {
          url: '/_next/static/chunks/app/(admin)/layout-6781603a0a0cdaf9.js',
          revision: '6781603a0a0cdaf9',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/addresses/page-128b4ae72c7bcb77.js',
          revision: '128b4ae72c7bcb77',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/notifications/page-c93e2dd028a2665f.js',
          revision: 'c93e2dd028a2665f',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/orders/%5BorderId%5D/page-486444ab50b84bf3.js',
          revision: '486444ab50b84bf3',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/orders/layout-91038fef48d8e46f.js',
          revision: '91038fef48d8e46f',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/orders/page-f51603080cffba42.js',
          revision: 'f51603080cffba42',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/page-c934d4e98d691534.js',
          revision: 'c934d4e98d691534',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/privacy/page-526b339fd286e807.js',
          revision: '526b339fd286e807',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/profile/page-c93cbebdb2ccb705.js',
          revision: 'c93cbebdb2ccb705',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/searches/page-b2ba5ceffce7b538.js',
          revision: 'b2ba5ceffce7b538',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/account/support/page-aeb7cb2568826eb4.js',
          revision: 'aeb7cb2568826eb4',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/cart/page-ef8ba489a32ee2f3.js',
          revision: 'ef8ba489a32ee2f3',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/checkout/failed/page-7bd3006a67b9e5b9.js',
          revision: '7bd3006a67b9e5b9',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/checkout/page-badacb62db2999d7.js',
          revision: 'badacb62db2999d7',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/checkout/review/page-6e79d08e2ba6988d.js',
          revision: '6e79d08e2ba6988d',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/checkout/success/page-94f4349e85e0e8c3.js',
          revision: '94f4349e85e0e8c3',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/compare/page-3c35d07f99e6cab8.js',
          revision: '3c35d07f99e6cab8',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/favorites/page-7b7c208722d71582.js',
          revision: '7b7c208722d71582',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/featured-products/page-ec8eb6c9ab78079b.js',
          revision: 'ec8eb6c9ab78079b',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/flash-sales/page-7f1e411c45670f3e.js',
          revision: '7f1e411c45670f3e',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/forgot-password/page-5d3e8ebb55cab98d.js',
          revision: '5d3e8ebb55cab98d',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/health/page-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/layout-e008239a4709b146.js',
          revision: 'e008239a4709b146',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/login/page-1da65c5c4eba0568.js',
          revision: '1da65c5c4eba0568',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/order/confirmation/%5BorderId%5D/page-62f0732fa01d2783.js',
          revision: '62f0732fa01d2783',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/order/tracking/%5BorderId%5D/page-19104744dd1eb4e7.js',
          revision: '19104744dd1eb4e7',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/page-03f2df171cec3627.js',
          revision: '03f2df171cec3627',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/privacy/page-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/products/%5Bslug%5D/page-69ad72b6535c971e.js',
          revision: '69ad72b6535c971e',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/products/page-2e62923e0857ef01.js',
          revision: '2e62923e0857ef01',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/register/page-6a47f527b7f9b510.js',
          revision: '6a47f527b7f9b510',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/reset-password/page-796f1cb0642ee0d4.js',
          revision: '796f1cb0642ee0d4',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/returns/page-4fea2b176cf99863.js',
          revision: '4fea2b176cf99863',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/shipping/page-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/terms/page-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/verify-email/page-ef5d8e290c683ace.js',
          revision: 'ef5d8e290c683ace',
        },
        {
          url: '/_next/static/chunks/app/(storefront)/vouchers/page-f5b937c4ea294700.js',
          revision: 'f5b937c4ea294700',
        },
        {
          url: '/_next/static/chunks/app/_global-error/page-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-f8603633a4791bee.js',
          revision: 'f8603633a4791bee',
        },
        {
          url: '/_next/static/chunks/app/api/geocode/reverse/route-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/api/geocode/search/route-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/api/og/route-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/api/v1/%5B%5B...path%5D%5D/route-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/layout-a56d58109fd29198.js',
          revision: 'a56d58109fd29198',
        },
        {
          url: '/_next/static/chunks/app/offline/page-86db8cf7839967c0.js',
          revision: '86db8cf7839967c0',
        },
        {
          url: '/_next/static/chunks/app/robots.txt/route-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/app/sitemap.xml/route-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        { url: '/_next/static/chunks/b19e40b5-e504614d6ef770b3.js', revision: 'e504614d6ef770b3' },
        { url: '/_next/static/chunks/ed48eaa7.076a2a1bf81ee573.js', revision: '076a2a1bf81ee573' },
        { url: '/_next/static/chunks/framework-eba9eac9563258a1.js', revision: 'eba9eac9563258a1' },
        { url: '/_next/static/chunks/main-8cecf89011a662b9.js', revision: '8cecf89011a662b9' },
        { url: '/_next/static/chunks/main-app-3875b828f1133ed9.js', revision: '3875b828f1133ed9' },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/app-error-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/forbidden-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/global-error-e205c6981d08ce40.js',
          revision: 'e205c6981d08ce40',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/not-found-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/unauthorized-f7dc0345c960d7e3.js',
          revision: 'f7dc0345c960d7e3',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        { url: '/_next/static/chunks/webpack-de73b466c334bd23.js', revision: 'de73b466c334bd23' },
        { url: '/_next/static/css/a313f70a2592e3f0.css', revision: 'a313f70a2592e3f0' },
        { url: '/_next/static/css/b95742d1f09da067.css', revision: 'b95742d1f09da067' },
        {
          url: '/_next/static/media/19cfc7226ec3afaa-s.woff2',
          revision: '9dda5cfc9a46f256d0e131bb535e46f8',
        },
        {
          url: '/_next/static/media/21350d82a1f187e9-s.woff2',
          revision: '4e2553027f1d60eff32898367dd4d541',
        },
        {
          url: '/_next/static/media/8e9860b6e62d6359-s.woff2',
          revision: '01ba6c2a184b8cba08b0d57167664d75',
        },
        {
          url: '/_next/static/media/ba9851c3c22cd980-s.woff2',
          revision: '9e494903d6b0ffec1a1e14d34427d44d',
        },
        {
          url: '/_next/static/media/c5fe6dc8356a8c31-s.woff2',
          revision: '027a89e9ab733a145db70f09b8a18b42',
        },
        {
          url: '/_next/static/media/df0a9ae256c0569c-s.woff2',
          revision: 'd54db44de5ccb18886ece2fda72bdfe0',
        },
        {
          url: '/_next/static/media/e4af272ccee01ff0-s.p.woff2',
          revision: '65850a373e258f1c897a2b3d75eb74de',
        },
        { url: '/_next/static/media/layers-2x.9859cd12.png', revision: '9859cd12' },
        { url: '/_next/static/media/layers.ef6db872.png', revision: 'ef6db872' },
        { url: '/_next/static/media/marker-icon-2x.93fdb12c.png', revision: '93fdb12c' },
        { url: '/_next/static/media/marker-icon.d577052a.png', revision: 'd577052a' },
        { url: '/_next/static/media/marker-shadow.612e3b52.png', revision: '612e3b52' },
        { url: '/icon-192.svg', revision: '45ab9c95147e96d62a4928ef8d612ece' },
        { url: '/icon-512.svg', revision: 'a32335b4d01cc74c1947121593308e2a' },
        { url: '/manifest.json', revision: '276fba2f6f95d6fb7781de8399d74bc7' },
        { url: '/mockServiceWorker.js', revision: '6ff677c5dcc39d339b8808df68a1408b' },
        { url: '/offline', revision: '_bx08IMiX5P1msQj0q35T' },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ request: e, response: s, event: c, state: a }) =>
              s && 'opaqueredirect' === s.type
                ? new Response(s.body, { status: 200, statusText: 'OK', headers: s.headers })
                : s,
          },
          { handlerDidError: async ({ request: e }) => self.fallback(e) },
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.googleapis\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
          { handlerDidError: async ({ request: e }) => self.fallback(e) },
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.gstatic\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-static',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
          { handlerDidError: async ({ request: e }) => self.fallback(e) },
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:png|jpg|jpeg|svg|webp|avif|gif)$/,
      new e.CacheFirst({
        cacheName: 'images',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 2592e3 }),
          { handlerDidError: async ({ request: e }) => self.fallback(e) },
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/api\./i,
      new e.NetworkFirst({
        cacheName: 'api',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 }),
          { handlerDidError: async ({ request: e }) => self.fallback(e) },
        ],
      }),
      'GET',
    );
});
