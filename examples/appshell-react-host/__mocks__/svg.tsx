/* eslint-disable react/jsx-props-no-spreading */
import { FC, SVGProps } from 'react';

/**
 * SVGs are compiled to React components by @svgr/webpack, so a test importing one needs
 * a component too — the stub transform hands back a filename string, which React then
 * tries to use as a tag name.
 */
const SvgMock: FC<SVGProps<SVGSVGElement>> = (props) => <svg {...props} />;

export default SvgMock;
