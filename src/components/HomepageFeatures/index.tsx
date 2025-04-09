import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import Link from '@docusaurus/Link';

type FeatureItem = {
  title: string;
  link: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList1: FeatureItem[] = [
  {
    title: 'Quick Start Guides',
    link: './docs/quick',
    Svg: require('@site/static/img/quickstartguide.svg').default,
    description: (
      <>
        Run Hive on MR3 on Hadoop, on Kubernetes, or in standalone mode.
      </>
    ),
  },
  {
    title: 'Features',
    link: './docs/features',
    Svg: require('@site/static/img/features.svg').default,
    description: (
      <>
        Check out all the advanced features of Hive on MR3.
      </>
    ),
  },
  {
    title: 'Operations Guides',
    link: './docs/guides',
    Svg: require('@site/static/img/operation.svg').default,
    description: (
      <>
        Find out all the details about operating Hive on MR3.
      </>
    ),
  },
];

const FeatureList2: FeatureItem[] = [
  {
    title: 'Blog',
    link: '/blog',
    Svg: require('@site/static/img/blog.svg').default,
    description: (
      <>
        Check the history of developing Hive on MR3!
      </>
    ),
  },
];

function Feature({title, link, Svg, description}: FeatureItem) {
  const isBlog = title === 'Blog';
  return (
    <div className={clsx('col', isBlog ? 'col--6' : 'col--3', isBlog ? 'text--center' : '')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center">
        <Heading as="h3">
          <Link to={link} className="button button--primary button--lg">
            {title}
          </Link>
        </Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row" style={{ justifyContent: 'center' }}>
          {FeatureList1.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          {FeatureList2.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
