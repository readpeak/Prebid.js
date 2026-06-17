import { expect } from 'chai';
import { spec, ENDPOINT } from 'modules/readpeakBidAdapter.js';

describe('ReadPeakAdapter', function() {
  let baseBidRequest;
  let bannerBidRequest;
  let nativeBidRequest;
  let nativeServerResponse;
  let bannerServerResponse;
  let bidderRequest;

  beforeEach(function() {
    bidderRequest = {
      refererInfo: {
        page: 'https://publisher.com/home',
        domain: 'publisher.com'
      },
      ortb2: {
        site: {
          page: 'https://publisher.com/home',
          domain: 'publisher.com'
        },
        device: {
          ua: navigator.userAgent,
          language: navigator.language,
        }
      }
    };

    baseBidRequest = {
      bidder: 'readpeak',
      params: {
        bidfloor: 5.0,
        publisherId: '11bc5dd5-7421-4dd8-c926-40fa653bec76',
        siteId: '11bc5dd5-7421-4dd8-c926-40fa653bec77',
        tagId: 'test-tag-1'
      },
      bidId: '2ffb201a808da7',
      bidderRequestId: '178e34bad3658f',
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
    };

    nativeBidRequest = {
      ...baseBidRequest,
      nativeParams: {
        title: { required: true, len: 200 },
        image: { wmin: 100 },
        sponsoredBy: {},
        body: { required: false },
        cta: { required: false }
      },
      mediaTypes: {
        native: {
          title: { required: true, len: 200 },
          image: { wmin: 100 },
          sponsoredBy: {},
          body: { required: false },
          cta: { required: false }
        },
      }
    };
    bannerBidRequest = {
      ...baseBidRequest,
      mediaTypes: {
        banner: {
          sizes: [[640, 320], [300, 600]],
        }
      },
      sizes: [[640, 320], [300, 600]],
    };
    nativeServerResponse = {
      id: baseBidRequest.bidderRequestId,
      cur: 'USD',
      seatbid: [
        {
          bid: [
            {
              id: 'baseBidRequest.bidId',
              impid: baseBidRequest.bidId,
              price: 0.12,
              cid: '12',
              crid: '123',
              adomain: ['readpeak.com'],
              adm: {
                assets: [
                  {
                    id: 1,
                    title: {
                      text: 'Title'
                    }
                  },
                  {
                    id: 3,
                    data: {
                      type: 1,
                      value: 'Brand Name'
                    }
                  },
                  {
                    id: 4,
                    data: {
                      type: 2,
                      value: 'Description'
                    }
                  },
                  {
                    id: 2,
                    img: {
                      type: 3,
                      url: 'http://url.to/image',
                      w: 750,
                      h: 500
                    }
                  }
                ],
                link: {
                  url: 'http://url.to/target'
                },
                imptrackers: ['http://url.to/pixeltracker']
              }
            }
          ]
        }
      ]
    };
    bannerServerResponse = {
      id: baseBidRequest.bidderRequestId,
      cur: 'USD',
      seatbid: [
        {
          bid: [
            {
              id: 'baseBidRequest.bidId',
              impid: baseBidRequest.bidId,
              price: 0.12,
              cid: '12',
              crid: '123',
              adomain: ['readpeak.com'],
              adm: '<iframe src=\"http://localhost:8081/url/creative?id=4326&l=f707685dfbbcdbe3&bad=0-0-95O0O0OdO640360&b=e4d39f94-533d-4577-a579-585fd4c02b0a&w=640&h=360&gc=0\" style=\"border: 0; display: block\" width=640 height=360></iframe>',
              burl: 'https://localhost:8081/url/b?d=0O95O4326I528Ie4d39f94-533d-4577-a579-585fd4c02b0aI0I352e303232363639333139393939393939&c=USD&p=${AUCTION_PRICE}&bad=0-0-95O0O0OdO640360&gc=0',
              nurl: 'https://localhost:8081/url/n?d=0O95O4326I528Ie4d39f94-533d-4577-a579-585fd4c02b0aI0I352e303232363639333139393939393939&gc=0',
              w: 640,
              h: 360,
            }
          ]
        }
      ]
    };
  });

  describe('Native', function() {
    describe('spec.isBidRequestValid', function() {
      it('should return true when the required params are passed', function() {
        expect(spec.isBidRequestValid(nativeBidRequest)).to.equal(true);
      });

      it('should return false when the "publisherId" param is missing', function() {
        nativeBidRequest.params = {
          bidfloor: 5.0
        };
        expect(spec.isBidRequestValid(nativeBidRequest)).to.equal(false);
      });

      it('should return false when no bid params are passed', function() {
        nativeBidRequest.params = {};
        expect(spec.isBidRequestValid(nativeBidRequest)).to.equal(false);
      });

      it('should return false when a bid request is not passed', function() {
        expect(spec.isBidRequestValid()).to.equal(false);
        expect(spec.isBidRequestValid({})).to.equal(false);
      });
    });

    describe('spec.buildRequests', function() {
      it('should create a POST request for every bid', function() {
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENDPOINT);
      });

      it('should attach request data', function() {
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);

        const data = request.data;

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        expect(data.id).to.equal(nativeBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(nativeBidRequest.params.bidfloor);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
        expect(data.imp[0].tagid).to.equal('test-tag-1');
        expect(data.site.publisher.id).to.equal(nativeBidRequest.params.publisherId);
        expect(data.site.id).to.equal(nativeBidRequest.params.siteId);
        expect(data.site.page).to.equal(bidderRequest.ortb2.site.page);
        expect(data.site.domain).to.equal(bidderRequest.ortb2.site.domain);
        expect(data.device).to.deep.contain({
          ua: navigator.userAgent,
          language: navigator.language
        });
        expect(data.user).to.be.undefined;
        expect(data.regs).to.be.undefined;
      });

      it('should get bid floor from module when params.bidfloor is not set', function() {
        const floorModuleData = {
          currency: 'USD',
          floor: 3.2,
        };
        delete nativeBidRequest.params.bidfloor;
        nativeBidRequest.getFloor = function () {
          return floorModuleData;
        };
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);

        const data = request.data;

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        expect(data.id).to.equal(nativeBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(floorModuleData.floor);
        expect(data.imp[0].bidfloorcur).to.equal(floorModuleData.currency);
      });

      it('should prefer params.bidfloor over floor module', function() {
        const floorModuleData = {
          currency: 'USD',
          floor: 3.2,
        };
        nativeBidRequest.getFloor = function () {
          return floorModuleData;
        };
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);

        const data = request.data;

        expect(data.imp[0].bidfloor).to.equal(nativeBidRequest.params.bidfloor);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('should send gdpr data when gdpr does not apply', function() {
        const request = spec.buildRequests([nativeBidRequest], {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            user: { ext: { consent: '' } },
            regs: { ext: { gdpr: 0 } }
          }
        });

        const data = request.data;

        expect(data.user).to.deep.equal({
          ext: {
            consent: ''
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: 0
          }
        });
      });

      it('should send gdpr data when gdpr applies', function() {
        const tcString = 'sometcstring';
        const request = spec.buildRequests([nativeBidRequest], {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            user: { ext: { consent: tcString } },
            regs: { ext: { gdpr: 1 } }
          }
        });

        const data = request.data;

        expect(data.user).to.deep.equal({
          ext: {
            consent: tcString
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: 1
          }
        });
      });
    });

    describe('spec.interpretResponse', function() {
      it('should return no bids if the response is not valid', function() {
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);
        const bidResponse = spec.interpretResponse({ body: null }, request);
        expect(bidResponse.length).to.equal(0);
      });

      it('should return a valid bid response', function() {
        const request = spec.buildRequests([nativeBidRequest], bidderRequest);
        const bidResponse = spec.interpretResponse(
          { body: nativeServerResponse },
          request
        )[0];
        expect(bidResponse).to.contain({
          requestId: nativeBidRequest.bidId,
          cpm: nativeServerResponse.seatbid[0].bid[0].price,
          creativeId: nativeServerResponse.seatbid[0].bid[0].crid,
          ttl: 300,
          netRevenue: true,
          mediaType: 'native',
          currency: nativeServerResponse.cur
        });

        expect(bidResponse.meta).to.deep.equal({
          advertiserDomains: ['readpeak.com'],
        });

        if (FEATURES.NATIVE) {
          // ortbConverter returns native in ORTB format
          const ortbNative = bidResponse.native.ortb;
          expect(ortbNative.assets).to.be.an('array');
          expect(ortbNative.assets.find(a => a.title)).to.deep.include({
            title: { text: 'Title' }
          });
          expect(ortbNative.link.url).to.equal('http://url.to/target');
          expect(ortbNative.imptrackers).to.contain('http://url.to/pixeltracker');
        }
      });
    });
  });

  describe('Banner', function() {
    describe('spec.isBidRequestValid', function() {
      it('should return true when the required params are passed', function() {
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(true);
      });

      it('should return false when the "publisherId" param is missing', function() {
        bannerBidRequest.params = {
          bidfloor: 5.0
        };
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(false);
      });

      it('should return false when no bid params are passed', function() {
        bannerBidRequest.params = {};
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(false);
      });
    });

    describe('spec.buildRequests', function() {
      it('should create a POST request for every bid', function() {
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENDPOINT);
      });

      it('should attach request data', function() {
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = request.data;

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        expect(data.id).to.equal(bannerBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(bannerBidRequest.params.bidfloor);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
        expect(data.imp[0].tagid).to.equal('test-tag-1');
        expect(data.site.publisher.id).to.equal(bannerBidRequest.params.publisherId);
        expect(data.site.id).to.equal(bannerBidRequest.params.siteId);
        expect(data.site.page).to.equal(bidderRequest.ortb2.site.page);
        expect(data.site.domain).to.equal(bidderRequest.ortb2.site.domain);
        expect(data.device).to.deep.contain({
          ua: navigator.userAgent,
          language: navigator.language
        });
        expect(data.user).to.be.undefined;
        expect(data.regs).to.be.undefined;
      });

      it('should get bid floor from module when params.bidfloor is not set', function() {
        const floorModuleData = {
          currency: 'USD',
          floor: 3.2,
        };
        delete bannerBidRequest.params.bidfloor;
        bannerBidRequest.getFloor = function () {
          return floorModuleData;
        };
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = request.data;

        expect(data.source.ext.prebid).to.equal('$prebid.version$');
        expect(data.id).to.equal(bannerBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(floorModuleData.floor);
        expect(data.imp[0].bidfloorcur).to.equal(floorModuleData.currency);
      });

      it('should prefer params.bidfloor over floor module', function() {
        const floorModuleData = {
          currency: 'USD',
          floor: 3.2,
        };
        bannerBidRequest.getFloor = function () {
          return floorModuleData;
        };
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = request.data;

        expect(data.imp[0].bidfloor).to.equal(bannerBidRequest.params.bidfloor);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('should send gdpr data when gdpr does not apply', function() {
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            user: { ext: { consent: '' } },
            regs: { ext: { gdpr: 0 } }
          }
        });

        const data = request.data;

        expect(data.user).to.deep.equal({
          ext: {
            consent: ''
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: 0
          }
        });
      });

      it('should send gdpr data when gdpr applies', function() {
        const tcString = 'sometcstring';
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ortb2: {
            ...bidderRequest.ortb2,
            user: { ext: { consent: tcString } },
            regs: { ext: { gdpr: 1 } }
          }
        });

        const data = request.data;

        expect(data.user).to.deep.equal({
          ext: {
            consent: tcString
          }
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: 1
          }
        });
      });
    });

    describe('spec.interpretResponse', function() {
      it('should return no bids if the response is not valid', function() {
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);
        const bidResponse = spec.interpretResponse({ body: null }, request);
        expect(bidResponse.length).to.equal(0);
      });

      it('should return a valid bid response', function() {
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);
        const bidResponse = spec.interpretResponse(
          { body: bannerServerResponse },
          request
        )[0];
        expect(bidResponse).to.contain({
          requestId: bannerBidRequest.bidId,
          cpm: bannerServerResponse.seatbid[0].bid[0].price,
          creativeId: bannerServerResponse.seatbid[0].bid[0].crid,
          ttl: 300,
          netRevenue: true,
          mediaType: 'banner',
          currency: bannerServerResponse.cur,
          width: bannerServerResponse.seatbid[0].bid[0].w,
          height: bannerServerResponse.seatbid[0].bid[0].h,
          burl: bannerServerResponse.seatbid[0].bid[0].burl,
        });
        // ortbConverter prepends nurl tracking pixel to ad markup
        expect(bidResponse.ad).to.contain(bannerServerResponse.seatbid[0].bid[0].adm);
        expect(bidResponse.meta).to.deep.equal({
          advertiserDomains: ['readpeak.com'],
        });
      });
    });
  });

  if (FEATURES.NATIVE) {
    describe('Multi-format', function() {
      function mixedBidRequest() {
        return {
          ...nativeBidRequest,
          mediaTypes: {
            ...nativeBidRequest.mediaTypes,
            banner: bannerBidRequest.mediaTypes.banner,
          },
          sizes: bannerBidRequest.sizes,
        };
      }

      it('should parse banner responses as banner when the request imp also supports native', function() {
        const bidRequest = mixedBidRequest();
        const request = spec.buildRequests([bidRequest], bidderRequest);
        const response = {
          ...bannerServerResponse,
          seatbid: [{
            bid: [{
              ...bannerServerResponse.seatbid[0].bid[0],
              impid: bidRequest.bidId,
              mtype: 1,
            }],
          }],
        };

        expect(request.data.imp[0].banner).to.exist;
        expect(request.data.imp[0].native).to.exist;

        const bidResponse = spec.interpretResponse({ body: response }, request)[0];

        expect(bidResponse.mediaType).to.equal('banner');
        expect(bidResponse.ad).to.contain(bannerServerResponse.seatbid[0].bid[0].adm);
      });

      it('should parse native responses as native when native adm is returned for a mixed imp', function() {
        const bidRequest = mixedBidRequest();
        const request = spec.buildRequests([bidRequest], bidderRequest);
        const response = {
          ...nativeServerResponse,
          seatbid: [{
            bid: [{
              ...nativeServerResponse.seatbid[0].bid[0],
              impid: bidRequest.bidId,
              adm: JSON.stringify(nativeServerResponse.seatbid[0].bid[0].adm),
              mtype: 1,
            }],
          }],
        };

        const bidResponse = spec.interpretResponse({ body: response }, request)[0];

        expect(bidResponse.mediaType).to.equal('native');
        expect(bidResponse.native.ortb.assets.find(a => a.title)).to.deep.include({
          title: { text: 'Title' }
        });
      });
    });
  }
});
