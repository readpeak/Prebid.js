import { isStr, replaceAuctionPrice, triggerPixel, deepSetValue } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { NATIVE, BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

export const ENDPOINT = 'https://app.readpeak.com/header/prebid';

const BIDDER_CODE = 'readpeak';
const GVLID = 290;
const ORTB_MTYPE_BANNER = 1;
const ORTB_MTYPE_NATIVE = 4;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp) return imp;

    // Prefer publisher-set params.bidfloor, fall back to floor module
    let bidFloor = 0;
    let bidFloorCur = 'USD';

    if (bidRequest.params.bidfloor) {
      bidFloor = bidRequest.params.bidfloor;
      bidFloorCur = bidRequest.params.bidfloorcur || 'USD';
    } else if (typeof bidRequest.getFloor === 'function') {
      const floorInfo = bidRequest.getFloor({
        currency: 'USD',
        mediaType: '*',
        size: '*',
      });
      if (floorInfo && floorInfo.currency === 'USD' && floorInfo.floor) {
        bidFloor = floorInfo.floor;
        bidFloorCur = floorInfo.currency;
      }
    }

    imp.bidfloor = bidFloor;
    imp.bidfloorcur = bidFloorCur;
    imp.tagid = bidRequest.params.tagId || '0';

    // Ensure native imp is populated when nativeOrtbRequest isn't available
    if (bidRequest.mediaTypes && bidRequest.mediaTypes.native && !imp.native) {
      imp.native = buildNativeImp(bidRequest);
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    const bidRequests = context.bidRequests;
    if (bidRequests && bidRequests.length > 0) {
      request.id = bidRequests[0].bidderRequestId;
    }

    deepSetValue(request, 'source.ext.prebid', '$prebid.version$');

    // Site publisher and site id from params
    const firstBid = bidRequests && bidRequests[0];
    if (firstBid && firstBid.params) {
      if (firstBid.params.publisherId) {
        deepSetValue(request, 'site.publisher.id', firstBid.params.publisherId.toString());
      }
      if (firstBid.params.siteId) {
        deepSetValue(request, 'site.id', firstBid.params.siteId.toString());
      } else if (firstBid.params.publisherId) {
        deepSetValue(request, 'site.id', firstBid.params.publisherId.toString());
      }
    }

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = getBidMediaType(bid, context);
    return buildBidResponse(bid, context);
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,

  supportedMediaTypes: [NATIVE, BANNER],

  isBidRequestValid: (bid) => !!(bid && bid.params && bid.params.publisherId),

  buildRequests: (bidRequests, bidderRequest) => {
    const data = converter.toORTB({ bidRequests, bidderRequest });
    return {
      method: 'POST',
      url: ENDPOINT,
      data,
    };
  },

  interpretResponse: (response, request) => {
    if (!response.body) {
      return [];
    }
    return converter.fromORTB({ request: request.data, response: response.body }).bids;
  },

  onBidWon: (bid) => {
    if (bid.burl && isStr(bid.burl)) {
      bid.burl = replaceAuctionPrice(bid.burl, bid.cpm);
      triggerPixel(bid.burl);
    }
  },
};

registerBidder(spec);

function getBidMediaType(bid, context) {
  if (isNativeAdm(bid.adm) || bid.mtype === ORTB_MTYPE_NATIVE) {
    return NATIVE;
  }
  if (bid.mtype === ORTB_MTYPE_BANNER) {
    return BANNER;
  }
  if (context.imp && context.imp.native && !context.imp.banner) {
    return NATIVE;
  }
  return BANNER;
}

function isNativeAdm(adm) {
  if (adm && typeof adm === 'object') {
    return Array.isArray(adm.assets);
  }
  if (isStr(adm)) {
    try {
      const parsed = JSON.parse(adm);
      return !!(parsed && Array.isArray(parsed.assets));
    } catch (e) {}
  }
  return false;
}

const NATIVE_DEFAULTS = {
  TITLE_LEN: 70,
  DESCR_LEN: 120,
  SPONSORED_BY_LEN: 50,
  IMG_MIN: 150,
  ICON_MIN: 50,
  CTA_LEN: 50,
};

function buildNativeImp(bidRequest) {
  const params = bidRequest.nativeParams || bidRequest.mediaTypes.native;
  if (!params) return undefined;

  const assets = [];
  if (params.title) {
    assets.push({
      id: 1,
      required: params.title.required ? 1 : 0,
      title: { len: params.title.len || NATIVE_DEFAULTS.TITLE_LEN },
    });
  }
  if (params.image) {
    assets.push({
      id: 2,
      required: params.image.required ? 1 : 0,
      img: {
        type: 3,
        wmin: params.image.wmin || NATIVE_DEFAULTS.IMG_MIN,
        hmin: params.image.hmin || NATIVE_DEFAULTS.IMG_MIN,
      },
    });
  }
  if (params.sponsoredBy) {
    assets.push({
      id: 3,
      required: params.sponsoredBy.required ? 1 : 0,
      data: { type: 1, len: params.sponsoredBy.len || NATIVE_DEFAULTS.SPONSORED_BY_LEN },
    });
  }
  if (params.body) {
    assets.push({
      id: 4,
      required: params.body.required ? 1 : 0,
      data: { type: 2, len: params.body.len || NATIVE_DEFAULTS.DESCR_LEN },
    });
  }
  if (params.cta) {
    assets.push({
      id: 5,
      required: params.cta.required ? 1 : 0,
      data: { type: 12, len: params.cta.len || NATIVE_DEFAULTS.CTA_LEN },
    });
  }
  return {
    request: JSON.stringify({ assets }),
    ver: '1.1',
  };
}
