import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSinon from 'sinon-chai';

export const mochaHooks = {
    async beforeAll() {
        chai.should();
        chai.use(chaiAsPromised);
        chai.use(chaiSinon);
    }
};
