import './Home.css'

function Home() {
  return (
    <div className="home-container">
      <header>
        <h1>Max Cembalest</h1>
      </header>

      <main>
        <h2>Bio</h2>
        <section className="professional-section">
          <div className="bio-content">
            <img src="/personal/max_tokyo_full.jpg" alt="Max in Tokyo" className="profile-image" />
            <div className="bio-text">
              <p>
                Hi, I'm Max. I'm an AI developer &amp; researcher based in NYC with 3 years of experience making AI more defensible and explainable. I've worked for <a href="https://www.nomic.ai/">Nomic AI</a> and <a href="https://www.arthur.ai/">Arthur AI</a>.
              </p>

              <p>
                I received my MS in Data Science from Harvard University in 2022.
              </p>

              <p>
                Before studying and working in AI, I taught calculus and computer science at <a href="https://www.africanleadershipacademy.org/">African Leadership Academy</a>, a high school in Johannesburg, South Africa.
              </p>
            </div>
          </div>
        </section>

        <h2>My Work @ Nomic AI</h2>
        <section className="professional-section">
          <div className="bio-content">
            <div className="nomic-images">
              <img src="/nomic/nomic-embed-v2-benchmark1.png" alt="Nomic Embed v2 Benchmark 1" />
              <img src="/nomic/nomic-mnist-training-dynamics.png" alt="Nomic MNIST Training Dynamics" />
            </div>
            <div className="bio-text">
              <h3>Making Embeddings Usable & Understandable for Developers</h3>
              <p>
                I worked at Nomic AI for one year building AI systems that leverage vector embeddings and dimensionality reduction for retrieval, clustering, and analysis. I was responsible for the software and technical guides that enabled tens of thousands of developers to use Nomic models and products.
              </p>
              <p>
                The main challenge faced by Nomic AI was demonstrating the value of embeddings: they are the core machine learning technology behind Nomic's retrieval, clustering, and data analysis products. They can be a confusing topic for developers, so Nomic hired me to make these models and their applications understood by a wider audience.
              </p>
              <p>
                I worked on Nomic's entire suite of models and products - benchmarking the models, building the APIs and Python clients, and presenting end-to-end workflows to productionize Nomic's models and tools into deployed applications.
              </p>
              <p>
                I was responsible for the SDKs, <a href="https://docs.nomic.ai">technical guides</a>, and videos that enabled tens of thousands of developers to use Nomic models and products for retrieval, clustering, and advanced data analysis.
              </p>
            </div>
          </div>
        </section>

        <h2>My Work @ Arthur AI</h2>
        <section className="professional-section">
          <div className="bio-content">
          <div className="arthur-images">
              <img src="/arthur/LLM-eval-webinar-1.png" alt="Arthur LLM Evaluation Webinar" />
              <img src="/arthur/LLM-eval-webinar-2.png" alt="Arthur LLM Evaluation Webinar" />
              <img src="/arthur/shapley-residuals-medium.png" alt="Arthur Shapley Residuals Article" />
            </div>
            <div className="bio-text">
              <p>
                I worked for two years as a researcher at Arthur, an AI security and observability company, during the transition from classical ML to generative AI in enterprise deployments. I built interpretability systems for scalable model auditing, developed security systems to detect & mitigate against LLM failure modes like prompt injections and hallucinations, and had my work published at IEEE and ICLR.
              </p>
              <h3>Monitoring, Evaluation, & Security for the LLM Era</h3>
              <p>
                Starting in 2023, my role at Arthur pivoted into researching the new and emerging problem space of enterprise
                monitoring and security for applications using LLMs and other generative AI models. My work involved testing and benchmarking different LLMs
                as well as Arthur-designed systems for tracking prompt injections, hallucinations, and sensitive data leakage.
                This period of research culminated in public talks on the tradeoffs of different evaluation methods when measuring
                LLM performance. This research led to a <a href="https://arxiv.org/abs/2409.15268">paper</a> measuring how effective LLMs are at the evaluation
                of other LLMs when surface-level factors like large amounts of markdown formatting can distract LLMs-as-evaluators
                from noticing low-quality written text.
              </p>

              <h3>Making ML Interpretability Work for Enterprises</h3>
              <p>
                My work at Arthur focused on making the entire cycle of deployment, monitoring, data collection, performance
                interpretability, and model re-training more feasible for Arthur's customers. My research explored the ways we could make
                the automated generation of explanations more faithful to the underlying algorithmic processes the explanations
                were meant to represent (TLDR; unfortunately, methods of generating explanations like LIME and SHAP are wildly
                insufficient despite being trusted across the industry). This period of research culminated in a <a href="https://arxiv.org/abs/2303.13299">paper</a> exploring
                whether neural networks on tabular data could be made more explainable by modifying the training objective
                appropriately, since tabular data is otherwise best served by logistic regression, decision trees, and random
                forests (that is mostly what the industry already does).
              </p>
            </div>
          </div>
        </section>

        <section className="personal-section">
          <h2>Personal</h2>
          <div className="bio-content">
            <img src="/personal/max keys.png" alt="Max playing music" className="profile-image" />
            <div className="bio-text">
              <p>I currently live in Brooklyn, New York, where I play piano and synthesizer in the band <a href="https://www.instagram.com/tomorrowishband/">Tomorrowish</a>. I share my other musical musings on my <a href="https://soundcloud.com/cembalest">Soundcloud</a>.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Home

